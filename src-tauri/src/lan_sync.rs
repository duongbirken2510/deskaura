use serde::{Deserialize, Serialize};
use std::net::UdpSocket;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const PORT_START: u16 = 48888;
const PORT_END: u16 = 48895;
const LAN_REPLAY_WINDOW_MS: u64 = 30_000;
const LAN_ROOM_SALT: &str = "DeskAura::LanRoomSalt::v1.2.5";
const LAN_PACKET_MAC_SECRET: &str = "DeskAura::LanPulseHMAC::v1.2.5#CalmSync";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanPulsePacket {
    pub app: String,
    pub room_key: String,
    pub device_id: String,
    pub device_name: String,
    pub active_at: u64,
    pub next_standup_at: Option<u64>,
    pub next_eye_at: Option<u64>,
    pub next_water_at: Option<u64>,
    #[serde(default)]
    pub sig: Option<String>,
}

fn fnv1a32_bytes(bytes: &[u8], seed: u32) -> u32 {
    let mut h = seed;
    for &b in bytes {
        h ^= b as u32;
        h = h.wrapping_mul(0x0100_0193);
    }
    h
}

/// Anonymizes raw email or sync code into a 128-bit one-way room token (`rk2_<32hex>`)
/// so PII (like Gmail addresses) is never broadcast in plaintext over public/office Wi-Fi.
pub fn anonymize_room_key(raw: &str) -> String {
    let clean = raw.trim().to_lowercase();
    if clean.is_empty() {
        return String::new();
    }
    if clean.starts_with("rk2_") && clean.len() == 36 {
        return clean;
    }
    let h1 = fnv1a32_bytes(format!("{clean}|{LAN_ROOM_SALT}|1").as_bytes(), 0x811c_9dc5);
    let h2 = fnv1a32_bytes(format!("{clean}|{LAN_ROOM_SALT}|2").as_bytes(), 0x9e37_79b9);
    let h3 = fnv1a32_bytes(format!("{clean}|{LAN_ROOM_SALT}|3").as_bytes(), 0x85eb_ca6b);
    let h4 = fnv1a32_bytes(format!("{clean}|{LAN_ROOM_SALT}|4").as_bytes(), 0xc2b2_ae35);
    format!("rk2_{h1:08x}{h2:08x}{h3:08x}{h4:08x}")
}

fn compute_packet_signature(packet: &LanPulsePacket) -> String {
    let canonical = format!(
        "{}|{}|{}|{}|{:?}|{:?}|{:?}|{}",
        packet.app,
        packet.room_key,
        packet.device_id,
        packet.active_at,
        packet.next_standup_at,
        packet.next_eye_at,
        packet.next_water_at,
        LAN_PACKET_MAC_SECRET
    );
    let s1 = fnv1a32_bytes(canonical.as_bytes(), 0x811c_9dc5);
    let s2 = fnv1a32_bytes(canonical.as_bytes(), 0x9e37_79b9 ^ s1);
    format!("{s1:08x}{s2:08x}")
}

fn verify_incoming_packet(packet: &LanPulsePacket, now_ms: u64) -> bool {
    if packet.app != "deskaura_v12" || packet.room_key.is_empty() || packet.device_id.is_empty() {
        return false;
    }
    // Reject packets outside the ±30s replay protection window
    if now_ms.abs_diff(packet.active_at) > LAN_REPLAY_WINDOW_MS {
        return false;
    }
    let Some(ref sig) = packet.sig else {
        return false;
    };
    let expected = compute_packet_signature(packet);
    sig == &expected
}

static TX_SOCKET: OnceLock<Mutex<Option<UdpSocket>>> = OnceLock::new();

fn get_tx_socket() -> &'static Mutex<Option<UdpSocket>> {
    TX_SOCKET.get_or_init(|| {
        let sock = UdpSocket::bind("0.0.0.0:0").ok().and_then(|s| {
            let _ = s.set_broadcast(true);
            let _ = s.set_nonblocking(true);
            Some(s)
        });
        Mutex::new(sock)
    })
}

/// Starts a resilient background UDP listener that tries ports 48888..=48895.
/// Never panics if all ports are busy or blocked by firewall — silently degrades to Cloud Fallback.
pub fn start_lan_listener(app: AppHandle) {
    std::thread::spawn(move || {
        let mut bound_socket: Option<UdpSocket> = None;
        for port in PORT_START..=PORT_END {
            if let Ok(sock) = UdpSocket::bind(("0.0.0.0", port)) {
                let _ = sock.set_broadcast(true);
                let _ = sock.set_read_timeout(Some(Duration::from_millis(500)));
                bound_socket = Some(sock);
                break;
            }
        }

        let Some(socket) = bound_socket else {
            // All candidate ports 48888..=48895 are occupied; fallback to Firestore 120s heartbeat
            return;
        };

        let mut buf = [0u8; 2048];
        loop {
            match socket.recv_from(&mut buf) {
                Ok((len, _addr)) if len > 0 && len < 2048 => {
                    if let Ok(packet) = serde_json::from_slice::<LanPulsePacket>(&buf[..len]) {
                        let now_ms = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .map(|d| d.as_millis() as u64)
                            .unwrap_or(0);
                        if verify_incoming_packet(&packet, now_ms) {
                            let _ = app.emit("deskaura://lan-pulse", packet);
                        }
                    }
                }
                _ => {
                    std::thread::sleep(Duration::from_millis(80));
                }
            }
        }
    });
}

/// Broadcasts a lightweight UDP heartbeat/timer sync packet across local LAN ports 48888..=48895.
pub fn broadcast_lan_pulse(
    room_key: String,
    device_id: String,
    device_name: String,
    next_standup_at: Option<u64>,
    next_eye_at: Option<u64>,
    next_water_at: Option<u64>,
) -> bool {
    let hashed_room = anonymize_room_key(&room_key);
    if hashed_room.is_empty() || device_id.trim().is_empty() {
        return false;
    }

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let mut packet = LanPulsePacket {
        app: "deskaura_v12".to_string(),
        room_key: hashed_room,
        device_id,
        device_name,
        active_at: now_ms,
        next_standup_at,
        next_eye_at,
        next_water_at,
        sig: None,
    };
    packet.sig = Some(compute_packet_signature(&packet));

    let Ok(bytes) = serde_json::to_vec(&packet) else {
        return false;
    };

    let mut sent_any = false;
    if let Ok(guard) = get_tx_socket().lock() {
        if let Some(ref sock) = *guard {
            for port in PORT_START..=PORT_END {
                if sock.send_to(&bytes, ("255.255.255.255", port)).is_ok() {
                    sent_any = true;
                }
            }
        }
    }
    sent_any
}

