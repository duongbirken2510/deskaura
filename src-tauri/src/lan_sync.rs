use serde::{Deserialize, Serialize};
use std::net::UdpSocket;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const PORT_START: u16 = 48888;
const PORT_END: u16 = 48895;

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
                        if packet.app == "deskaura_v12" {
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
    if room_key.trim().is_empty() || device_id.trim().is_empty() {
        return false;
    }

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let packet = LanPulsePacket {
        app: "deskaura_v12".to_string(),
        room_key: room_key.trim().to_lowercase(),
        device_id,
        device_name,
        active_at: now_ms,
        next_standup_at,
        next_eye_at,
        next_water_at,
    };

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

