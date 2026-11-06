mod audio_ducker;
mod autostart;
mod idle_monitor;
mod lan_sync;
mod screen_filter;

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

#[derive(Serialize)]
pub struct SystemContextInfo {
    pub idle_seconds: u64,
    pub is_fullscreen: bool,
}

#[derive(Serialize)]
pub struct HardwareDeviceInfo {
    pub hardware_id: String,
    pub device_name: String,
    pub os: String,
}

#[tauri::command]
fn get_hardware_device_info() -> HardwareDeviceInfo {
    #[cfg(target_os = "macos")]
    {
        let mut hardware_id = String::new();
        if let Ok(out) = std::process::Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                if line.contains("IOPlatformUUID") {
                    if let Some(val) = line.split('=').nth(1) {
                        hardware_id = val.trim().trim_matches('"').to_string();
                        break;
                    }
                }
            }
        }

        let mut computer_name = String::new();
        if let Ok(out) = std::process::Command::new("scutil")
            .args(["--get", "ComputerName"])
            .output()
        {
            let name = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !name.is_empty() {
                computer_name = name;
            }
        }
        if computer_name.is_empty() {
            computer_name = "MacBook".to_string();
        }
        if hardware_id.is_empty() {
            hardware_id = format!("mac-{}", computer_name.to_lowercase().replace(' ', "-"));
        }

        HardwareDeviceInfo {
            hardware_id,
            device_name: format!("{} (macOS)", computer_name),
            os: "macOS".to_string(),
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut hardware_id = String::new();
        if let Ok(out) = std::process::Command::new("reg")
            .args([
                "query",
                r"HKLM\SOFTWARE\Microsoft\Cryptography",
                "/v",
                "MachineGuid",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                if line.contains("MachineGuid") {
                    if let Some(guid) = line.split_whitespace().last() {
                        hardware_id = guid.trim().to_string();
                        break;
                    }
                }
            }
        }
        let computer_name = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows PC".to_string());
        if hardware_id.is_empty() {
            hardware_id = format!("win-{}", computer_name.to_lowercase());
        }
        HardwareDeviceInfo {
            hardware_id,
            device_name: format!("{} (Windows)", computer_name),
            os: "Windows".to_string(),
        }
    }

    #[cfg(target_os = "linux")]
    {
        let mut hardware_id = std::fs::read_to_string("/etc/machine-id")
            .or_else(|_| std::fs::read_to_string("/var/lib/dbus/machine-id"))
            .unwrap_or_default()
            .trim()
            .to_string();

        let mut computer_name = std::fs::read_to_string("/etc/hostname")
            .unwrap_or_else(|_| std::env::var("HOSTNAME").unwrap_or_default())
            .trim()
            .to_string();

        if computer_name.is_empty() {
            computer_name = "Linux Workstation".to_string();
        }
        if hardware_id.is_empty() {
            hardware_id = format!("linux-{}", computer_name.to_lowercase().replace(' ', "-"));
        }

        HardwareDeviceInfo {
            hardware_id,
            device_name: format!("{} (Linux)", computer_name),
            os: "Linux".to_string(),
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        HardwareDeviceInfo {
            hardware_id: "desktop-generic".to_string(),
            device_name: "Desktop PC".to_string(),
            os: "Desktop".to_string(),
        }
    }
}

#[tauri::command]
async fn start_google_oauth_loopback(
    app: AppHandle,
    api_key: String,
    auth_domain: String,
    project_id: String,
) -> Result<String, String> {
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Không thể khởi tạo cổng xác thực cục bộ: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Không thể lấy cổng xác thực: {e}"))?
        .port();

    // Generate per-session anti-CSRF state nonce
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let state_nonce = format!("da_oauth_{:x}_{}", nanos, std::process::id());

    // Safely JSON-encode config strings to prevent any DOM/Script injection
    let safe_api_key = serde_json::to_string(&api_key).unwrap_or_else(|_| "\"\"".to_string());
    let safe_auth_domain =
        serde_json::to_string(&auth_domain).unwrap_or_else(|_| "\"\"".to_string());
    let safe_project_id = serde_json::to_string(&project_id).unwrap_or_else(|_| "\"\"".to_string());
    let safe_state_nonce =
        serde_json::to_string(&state_nonce).unwrap_or_else(|_| "\"\"".to_string());

    let auth_url = format!("http://localhost:{port}/");
    let _ = open_in_system_browser(auth_url);

    let app_clone = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _ = listener.set_nonblocking(true);
        let start = Instant::now();
        let timeout = Duration::from_secs(180);

        while start.elapsed() < timeout {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let _ = stream.set_nonblocking(false);
                    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
                    let mut buf = [0u8; 8192];
                    let n = stream.read(&mut buf).unwrap_or(0);
                    if n == 0 {
                        continue;
                    }
                    let req = String::from_utf8_lossy(&buf[..n]);
                    let first_line = req.lines().next().unwrap_or("");

                    if first_line.starts_with("GET /callback?") {
                        let path_part = first_line.split_whitespace().nth(1).unwrap_or("");
                        let query = path_part.split('?').nth(1).unwrap_or("");
                        let mut id_token = String::new();
                        let mut req_state = String::new();
                        let mut err_msg = String::new();

                        for pair in query.split('&') {
                            let mut kv = pair.splitn(2, '=');
                            let k = kv.next().unwrap_or("");
                            let v = kv.next().unwrap_or("");
                            if k == "id_token" {
                                id_token = v.to_string();
                            } else if k == "state" {
                                req_state = v.to_string();
                            } else if k == "error" {
                                err_msg = v.to_string();
                            }
                        }

                        if req_state != state_nonce {
                            let forbidden = "HTTP/1.1 403 Forbidden\r\nContent-Length: 19\r\nConnection: close\r\n\r\nInvalid OAuth state";
                            let _ = stream.write_all(forbidden.as_bytes());
                            let _ = stream.flush();
                            continue;
                        }

                        let success_html = r#"<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>DeskAura — Đã kết nối Gmail</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0fdf4; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #064e3b; }
  .card { background: white; padding: 36px 40px; border-radius: 24px; box-shadow: 0 12px 32px rgba(16,185,129,0.12); text-align: center; max-width: 420px; border: 1px solid #d1fae5; }
  .icon { font-size: 48px; margin-bottom: 12px; }
  h2 { margin: 0 0 8px; font-size: 20px; }
  p { margin: 0; font-size: 14px; color: #047857; line-height: 1.5; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h2>Đã kết nối Gmail thành công!</h2>
    <p>Bạn có thể đóng tab trình duyệt này và quay lại ứng dụng <b>DeskAura</b>.</p>
  </div>
  <script>setTimeout(() => window.close(), 1500);</script>
</body>
</html>"#;

                        let response = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nX-Content-Type-Options: nosniff\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            success_html.len(),
                            success_html
                        );
                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.flush();

                        if let Some(window) = app_clone.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }

                        if !id_token.is_empty() {
                            return Ok(id_token);
                        } else {
                            return Err(format!("Đăng nhập Google bị hủy hoặc chưa bật trên Firebase Console ({err_msg})"));
                        }
                    } else {
                        let login_html = format!(
                            r#"<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>DeskAura — Đăng nhập bằng Google (Gmail)</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1e293b; }}
  .card {{ background: white; padding: 36px 40px; border-radius: 24px; box-shadow: 0 12px 32px rgba(15,23,42,0.08); text-align: center; max-width: 440px; border: 1px solid #e2e8f0; }}
  h2 {{ margin: 0 0 8px; font-size: 20px; color: #0f172a; }}
  p {{ margin: 0 0 20px; font-size: 14px; color: #64748b; line-height: 1.5; }}
  button {{ background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer; }}
  button:hover {{ background: #059669; }}
  .err {{ margin-top: 14px; font-size: 12px; color: #e11d48; background: #fff1f2; padding: 10px; border-radius: 10px; display: none; }}
</style>
</head>
<body>
  <div class="card">
    <h2>💧 DeskAura Cloud Sync</h2>
    <p id="status">Đang mở cửa sổ chọn tài khoản Gmail của bạn...</p>
    <button id="btn" onclick="startLogin()">Chọn tài khoản Google (Gmail)</button>
    <div id="err" class="err"></div>
  </div>
  <script type="module">
    import {{ initializeApp }} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
    import {{ getAuth, GoogleAuthProvider, signInWithPopup }} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

    const OAUTH_STATE = {safe_state_nonce};
    const app = initializeApp({{
      apiKey: {safe_api_key},
      authDomain: {safe_auth_domain},
      projectId: {safe_project_id}
    }});
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({{ prompt: 'select_account' }});

    window.startLogin = async () => {{
      const errEl = document.getElementById('err');
      errEl.style.display = 'none';
      try {{
        const result = await signInWithPopup(auth, provider);
        const cred = GoogleAuthProvider.credentialFromResult(result);
        if (cred && cred.idToken) {{
          window.location.href = '/callback?state=' + encodeURIComponent(OAUTH_STATE) + '&id_token=' + encodeURIComponent(cred.idToken);
        }} else {{
          throw new Error('Không nhận được mã xác thực Google.');
        }}
      }} catch (e) {{
        errEl.style.display = 'block';
        errEl.textContent = e.message || String(e);
      }}
    }};

    window.addEventListener('DOMContentLoaded', () => {{
      setTimeout(() => window.startLogin(), 200);
    }});
  </script>
</body>
</html>"#
                        );

                        let response = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nX-Content-Type-Options: nosniff\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            login_html.len(),
                            login_html
                        );
                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.flush();
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(Duration::from_millis(80));
                }
                Err(_) => {
                    std::thread::sleep(Duration::from_millis(80));
                }
            }
        }
        Err("Hết thời gian chờ đăng nhập Google (3 phút).".to_string())
    })
    .await
    .map_err(|e| format!("Lỗi tiến trình xác thực: {e}"))?
}

#[tauri::command]
fn get_system_context() -> SystemContextInfo {
    SystemContextInfo {
        idle_seconds: idle_monitor::get_idle_seconds(),
        is_fullscreen: idle_monitor::is_fullscreen_active(),
    }
}

#[tauri::command]
fn duck_other_apps(app: AppHandle, target_ratio: f32) -> Result<usize, String> {
    if let Some(music_win) = app.get_webview_window("music-player") {
        let ratio = target_ratio.clamp(0.05, 1.0);
        let js = format!(
            r#"
            (function() {{
                const baseVol = window.__mamxanhUserVolume !== undefined ? window.__mamxanhUserVolume : 0.8;
                document.querySelectorAll('audio, video').forEach(el => {{
                    el.__mamxanhDucked = true;
                    el.__origVol = baseVol;
                    el.volume = Math.max(0.03, baseVol * {ratio});
                }});
            }})();
            "#
        );
        let _ = music_win.eval(&js);
    }
    audio_ducker::duck_other_applications(target_ratio)
}

#[tauri::command]
fn restore_other_apps(app: AppHandle) -> Result<usize, String> {
    if let Some(music_win) = app.get_webview_window("music-player") {
        let js = r#"
            (function() {
                const baseVol = window.__mamxanhUserVolume !== undefined ? window.__mamxanhUserVolume : 0.8;
                document.querySelectorAll('audio, video').forEach(el => {
                    el.__mamxanhDucked = false;
                    el.volume = baseVol;
                });
            })();
        "#;
        let _ = music_win.eval(js);
    }
    audio_ducker::restore_other_applications()
}

pub fn execute_zing_action(app: &AppHandle, action: &str, value: Option<f32>) -> bool {
    let Some(music_win) = app.get_webview_window("music-player") else {
        return false;
    };

    let js = match action {
        "play_pause" => r#"
            (function() {
                const audios = Array.from(document.querySelectorAll('audio, video'));
                const playingAudio = audios.find(a => !a.paused && a.duration > 0);
                if (playingAudio) {
                    playingAudio.pause();
                    window.__deskauraLastPausedAudio = playingAudio;
                    return;
                }
                if (window.__deskauraLastPausedAudio) {
                    window.__deskauraLastPausedAudio.play().catch(() => {});
                    window.__deskauraLastPausedAudio = null;
                    return;
                }
                if (audios.length > 0) {
                    const a = audios[0];
                    if (a.paused) a.play().catch(() => {});
                    else a.pause();
                    return;
                }
                const playBtn = document.querySelector('.player-controls .btn-play, .player-controls [title*="Tạm dừng"], .player-controls [title*="Phát"], button.zm-btn.ic-play-circle-outline, button.zm-btn.ic-pause-circle-outline, .playControl, #play-pause-button, button[aria-label*="Play"], button[aria-label*="Pause"]');
                if (playBtn) playBtn.click();
            })();
        "#.to_string(),
        "pause_only" => r#"
            (function() {
                document.querySelectorAll('audio, video').forEach(a => {
                    if (!a.paused) {
                        window.__deskauraLastPausedAudio = a;
                        a.pause();
                    }
                });
            })();
        "#.to_string(),
        "next" => r#"
            (function() {
                const nextBtn = document.querySelector('.btn-next, [title*="Bài tiếp theo"], .ic-next, .skipControl__next, button[aria-label*="Next"]');
                if (nextBtn) {
                    const btn = nextBtn.closest('button') || nextBtn;
                    btn.click();
                }
            })();
        "#.to_string(),
        "prev" => r#"
            (function() {
                const prevBtn = document.querySelector('.btn-pre, .btn-prev, [title*="Bài trước"], .ic-pre, .skipControl__previous, button[aria-label*="Previous"]');
                if (prevBtn) {
                    const btn = prevBtn.closest('button') || prevBtn;
                    btn.click();
                }
            })();
        "#.to_string(),
        "volume" => {
            let vol = value.unwrap_or(0.8).clamp(0.0, 1.0);
            format!(
                r#"
                (function() {{
                    window.__mamxanhUserVolume = {vol};
                    document.querySelectorAll('audio, video').forEach(el => {{
                        el.volume = {vol};
                    }});
                }})();
                "#
            )
        }
        "play_first" => r#"
            (function() {
                const firstPlay = document.querySelector('button[title*="Phát tất cả"], .zm-card-image .ic-play, .media-item .ic-play, .song-thumb .ic-play, .playButton, .sc-button-play, #play-pause-button');
                if (firstPlay) {
                    const btn = firstPlay.closest('button') || firstPlay;
                    btn.click();
                }
            })();
        "#.to_string(),
        _ => String::new(),
    };

    if !js.is_empty() {
        let _ = music_win.eval(&js);
    }
    true
}

fn validate_safe_external_url(raw: &str) -> Result<tauri::Url, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("URL trống".to_string());
    }
    // Reject any shell control characters to prevent command injection
    const FORBIDDEN_CHARS: &[char] = &['"', '\'', '`', '$', '|', ';', '\n', '\r', '<', '>'];
    if trimmed.chars().any(|c| FORBIDDEN_CHARS.contains(&c)) {
        return Err("URL chứa ký tự không an toàn".to_string());
    }
    let parsed: tauri::Url = trimmed
        .parse()
        .map_err(|e| format!("URL không hợp lệ: {e}"))?;
    let scheme = parsed.scheme();
    if scheme != "https" && scheme != "http" {
        return Err(format!("Giao thức không được phép: {scheme}"));
    }
    Ok(parsed)
}

#[tauri::command]
async fn open_web_music_player(
    app: AppHandle,
    url: String,
    title: Option<String>,
) -> Result<(), String> {
    let target_url = if url.trim().is_empty() || url == "__SHOW_ONLY__" {
        "https://zingmp3.vn/moi-phat-hanh".to_string()
    } else {
        url.trim().to_string()
    };

    let parsed = validate_safe_external_url(&target_url)?;

    if let Some(existing) = app.get_webview_window("music-player") {
        if url != "__SHOW_ONLY__" && !url.trim().is_empty() {
            let _ = existing.navigate(parsed);
        }
        let _ = existing.show();
        let _ = existing.unminimize();
        let _ = existing.set_focus();
        let _ = app.emit("zing-window-state", "visible");
        return Ok(());
    }

    let win_title = title.unwrap_or_else(|| {
        "🎶 DeskAura — Trình Phát Nhạc Zing MP3 (Bấm X để ẩn chạy ngầm, nhạc vẫn phát)".to_string()
    });

    let init_script = r#"
        (function() {
            window.__mamxanhUserVolume = 0.8;
            window.__mamxanhAdSkippedCount = 0;

            const AD_KEYWORDS = [
                'imasdk.googleapis.com',
                'doubleclick.net',
                'googlesyndication.com',
                'googleads.',
                'adtima.vn',
                'admicro.vn',
                'adtimaserver',
                'za.zdn.vn/v3/ad',
                '/vast',
                'preroll',
                'midroll',
                'audio_ad'
            ];

            const isAdUrl = (url) => {
                if (!url || typeof url !== 'string') return false;
                const lower = url.toLowerCase();
                return AD_KEYWORDS.some(k => lower.includes(k));
            };

            const origFetch = window.fetch;
            if (origFetch) {
                window.fetch = function(input, init) {
                    const url = typeof input === 'string' ? input : (input && input.url) || '';
                    if (isAdUrl(url)) {
                        window.__mamxanhAdSkippedCount++;
                        return Promise.resolve(new Response('', { status: 200, statusText: 'OK' }));
                    }
                    return origFetch.apply(this, arguments);
                };
            }

            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                this.__isBlockedAd = isAdUrl(String(url || ''));
                if (this.__isBlockedAd) {
                    window.__mamxanhAdSkippedCount++;
                    return origOpen.call(this, method, 'data:text/plain,', true);
                }
                return origOpen.apply(this, arguments);
            };

            const injectAdBlockStyle = () => {
                if (document.getElementById('__mamxanh_adguard_css')) return;
                const style = document.createElement('style');
                style.id = '__mamxanh_adguard_css';
                style.textContent = `
                    [class*="ads-container"],
                    [class*="ad-banner"],
                    [id*="adtima"],
                    iframe[src*="adtima"],
                    iframe[src*="doubleclick"],
                    iframe[src*="googlesyndication"],
                    .zm-ads-banner,
                    .sidebar-ads,
                    .header-ads {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        pointer-events: none !important;
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            };

            const isCurrentlyPlayingAd = (mediaEl) => {
                const src = (mediaEl.currentSrc || mediaEl.src || '').toLowerCase();
                if (isAdUrl(src)) return true;

                const dur = mediaEl.duration;
                if (Number.isFinite(dur) && dur > 3 && dur <= 38) {
                    return true;
                }

                const playerBar = document.querySelector('.player-controls, .now-playing-bar, .zm-player-bar');
                if (playerBar) {
                    const txt = (playerBar.innerText || '').toLowerCase();
                    if (txt.includes('quảng cáo') || txt.includes('advertisement') || txt.includes('tài trợ')) {
                        return true;
                    }
                }
                return false;
            };

            const guardMediaElement = (el) => {
                if (!el) return;
                if (isCurrentlyPlayingAd(el)) {
                    el.muted = true;
                    el.volume = 0;
                    try {
                        el.playbackRate = 16.0;
                        if (Number.isFinite(el.duration) && el.duration > 0.5) {
                            el.currentTime = Math.max(0, el.duration - 0.15);
                        }
                    } catch (e) {}
                    window.__mamxanhAdSkippedCount++;
                } else {
                    if (el.muted && el.playbackRate > 2) {
                        el.muted = false;
                        el.playbackRate = 1.0;
                    }
                    if (!el.__mamxanhDucked) {
                        el.volume = window.__mamxanhUserVolume !== undefined ? window.__mamxanhUserVolume : 0.8;
                    }
                }
            };

            const clickSkipAdButtons = () => {
                const buttons = document.querySelectorAll('button, a, div[role="button"], .ytp-ad-skip-button');
                for (const btn of buttons) {
                    const t = (btn.innerText || btn.getAttribute('title') || '').trim().toLowerCase();
                    if (
                        t === 'bỏ qua quảng cáo' ||
                        t === 'bỏ qua' ||
                        t.includes('skip ad') ||
                        t.includes('đóng quảng cáo')
                    ) {
                        try { btn.click(); } catch (e) {}
                    }
                }
            };

            setInterval(() => {
                injectAdBlockStyle();
                clickSkipAdButtons();
                document.querySelectorAll('audio, video').forEach(el => {
                    if (!el.__mamxanhHooked) {
                        el.__mamxanhHooked = true;
                        el.volume = window.__mamxanhUserVolume;
                        el.addEventListener('loadedmetadata', () => guardMediaElement(el));
                        el.addEventListener('durationchange', () => guardMediaElement(el));
                        el.addEventListener('timeupdate', () => guardMediaElement(el));
                        el.addEventListener('play', () => guardMediaElement(el));
                    }
                    guardMediaElement(el);
                });
            }, 350);
        })();
    "#;

    WebviewWindowBuilder::new(&app, "music-player", WebviewUrl::External(parsed))
        .title(win_title)
        .inner_size(1080.0, 720.0)
        .min_inner_size(800.0, 560.0)
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .initialization_script(init_script)
        .center()
        .build()
        .map_err(|e| format!("Không thể mở trình phát Zing MP3: {e}"))?;

    let _ = app.emit("zing-window-state", "visible");
    Ok(())
}

#[tauri::command]
fn open_in_system_browser(url: String) -> Result<(), String> {
    let parsed = validate_safe_external_url(&url)?;
    let safe_url = parsed.to_string();

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &safe_url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Không thể mở trình duyệt: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&safe_url)
            .spawn()
            .map_err(|e| format!("Không thể mở trình duyệt trên macOS: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&safe_url)
            .spawn()
            .map_err(|e| format!("Không thể mở trình duyệt trên Linux: {e}"))?;
    }
    Ok(())
}

/// Verifies that a downloaded binary is a real binary (PE MZ header on Windows, ELF header on Linux AppImage, or non-HTML binary >500KB on macOS)
/// and not an HTML error page or corrupted transfer.
fn is_valid_binary_payload(path: &std::path::Path, min_bytes: u64) -> bool {
    use std::io::Read;
    let Ok(meta) = std::fs::metadata(path) else {
        return false;
    };
    if meta.len() < min_bytes {
        return false;
    }
    let Ok(mut file) = std::fs::File::open(path) else {
        return false;
    };
    let mut header = [0u8; 16];
    if file.read_exact(&mut header).is_err() {
        return false;
    }
    // Reject HTML/XML error pages disguised as binary downloads
    if header.starts_with(b"<!DOC") || header.starts_with(b"<html") || header.starts_with(b"<?xml") {
        return false;
    }
    #[cfg(target_os = "windows")]
    {
        // Windows PE executables must start with Magic Bytes "MZ" (0x4D, 0x5A)
        if header[0] != 0x4D || header[1] != 0x5A {
            return false;
        }
    }
    #[cfg(target_os = "linux")]
    {
        // Linux AppImage is an ELF binary starting with 0x7F 'E' 'L' 'F', and .deb starts with "!<arch>\n"
        let is_elf = header.starts_with(&[0x7F, b'E', b'L', b'F']);
        let is_deb = header.starts_with(b"!<arch>\n");
        if !is_elf && !is_deb {
            return false;
        }
    }
    true
}

/// Two-Phase Garbage Collection: Cleans up any leftover update installers, DMGs, AppImages, or `.old.exe` files on startup.
fn cleanup_old_update_files() {
    // 1. Clean `.old.exe` / `.old.AppImage` next to current executable (In-Place Swap leftovers)
    if let Ok(current_exe) = std::env::current_exe() {
        let old_exe = current_exe.with_extension("old.exe");
        let _ = std::fs::remove_file(&old_exe);
        let old_appimage = current_exe.with_extension("old.AppImage");
        let _ = std::fs::remove_file(&old_appimage);
        if let Some(parent) = current_exe.parent() {
            let _ = std::fs::remove_file(parent.join("deskaura.old.exe"));
            let _ = std::fs::remove_file(parent.join("deskaura.update.exe"));
            let _ = std::fs::remove_file(parent.join("DeskAura_Portable.old.exe"));
            let _ = std::fs::remove_file(parent.join("DeskAura.old.AppImage"));
        }
    }
    if let Ok(appimage_env) = std::env::var("APPIMAGE") {
        if !appimage_env.trim().is_empty() {
            let old_ai = std::path::PathBuf::from(&appimage_env).with_extension("old.AppImage");
            let _ = std::fs::remove_file(old_ai);
        }
    }

    // 2. Clean temporary update installers / DMGs / AppImages in OS temp directory & private OTA vault
    let temp_dir = std::env::temp_dir();
    let ota_vault = temp_dir.join("deskaura_ota_vault");
    let _ = std::fs::remove_dir_all(&ota_vault);

    if let Ok(entries) = std::fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_deskaura_update = (name.starts_with("DeskAura_")
                && (name.ends_with(".dmg")
                    || name.ends_with("-setup.exe")
                    || name.ends_with(".AppImage")
                    || name.ends_with(".deb")))
                || (name.starts_with("deskaura_staged_")
                    && (name.ends_with(".exe") || name.ends_with(".AppImage")));
            if is_deskaura_update {
                let _ = std::fs::remove_file(entry.path());
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let mount_point = "/tmp/deskaura_update_mnt";
        if std::path::Path::new(mount_point).exists() {
            let _ = std::process::Command::new("/usr/bin/hdiutil")
                .args(["detach", mount_point, "-force"])
                .status();
        }
    }
}

/// Phase 1 of Chrome/VSCode Silent OTA: Downloads and stages/pre-installs the new version in the background.
#[tauri::command]
async fn stage_silent_update(version: String) -> Result<String, String> {
    let clean_ver: String = version
        .trim()
        .trim_start_matches('v')
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '-')
        .collect();

    if clean_ver.is_empty() {
        return Err("invalid_version".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let temp_dir = std::env::temp_dir();
        let staged_exe = temp_dir.join(format!("deskaura_staged_{}.exe", clean_ver));
        let staged_str = staged_exe.to_string_lossy().to_string();

        // Strategy A: Try Silent In-Place Binary Swap using DeskAura_Portable.exe (0 UAC, instant apply on next boot or restart)
        let portable_url =
            "https://github.com/duongbirken2510/deskaura/raw/main/Release_Windows/DeskAura_Portable.exe";
        let dl_ok = std::process::Command::new("curl.exe")
            .args(["-fL", "-sS", "-o", &staged_str, portable_url])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map(|s| s.success())
            .unwrap_or(false);

        let valid_portable = dl_ok && is_valid_binary_payload(&staged_exe, 2_000_000);

        if valid_portable {
            if let Ok(current_exe) = std::env::current_exe() {
                let old_exe = current_exe.with_extension("old.exe");
                let _ = std::fs::remove_file(&old_exe);
                if std::fs::rename(&current_exe, &old_exe).is_ok() {
                    if std::fs::copy(&staged_exe, &current_exe).is_ok() {
                        let _ = std::fs::remove_file(&staged_exe);
                        return Ok("staged_swapped".to_string());
                    } else {
                        // Rollback rename if copy failed
                        let _ = std::fs::rename(&old_exe, &current_exe);
                    }
                }
            }
        }
        let _ = std::fs::remove_file(&staged_exe);

        // Strategy B: Fallback to staging the NSIS setup installer in %TEMP% for silent /S execution
        let setup_url = format!(
            "https://github.com/duongbirken2510/deskaura/raw/main/Release_Windows/DeskAura_{}_x64-setup.exe",
            clean_ver
        );
        let installer_path = temp_dir.join(format!("DeskAura_{}_x64-setup.exe", clean_ver));
        let installer_str = installer_path.to_string_lossy().to_string();

        let status = std::process::Command::new("curl.exe")
            .args(["-fL", "-sS", "-o", &installer_str, &setup_url])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| format!("stage_failed: {e}"))?;

        let valid_setup = status.success() && is_valid_binary_payload(&installer_path, 500_000);

        if !valid_setup {
            let _ = std::fs::remove_file(&installer_path);
            return Err("not_ready_yet".to_string());
        }

        return Ok("staged_installer".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let url = format!(
            "https://github.com/duongbirken2510/deskaura/raw/main/Release_macOS/DeskAura_{}_aarch64.dmg",
            clean_ver
        );
        let ota_vault = std::env::temp_dir().join("deskaura_ota_vault");
        let _ = std::fs::create_dir_all(&ota_vault);
        let dmg_path_buf = ota_vault.join(format!("DeskAura_{}_aarch64.dmg", clean_ver));
        let dmg_path = dmg_path_buf.to_string_lossy().to_string();

        let status = std::process::Command::new("/usr/bin/curl")
            .args(["-fL", "-sS", "-o", &dmg_path, &url])
            .status()
            .map_err(|e| format!("stage_failed: {e}"))?;

        let valid_file = status.success() && is_valid_binary_payload(&dmg_path_buf, 500_000);

        if !valid_file {
            let _ = std::fs::remove_file(&dmg_path_buf);
            return Err("not_ready_yet".to_string());
        }

        let mount_point_buf = ota_vault.join("mnt");
        let mount_point = mount_point_buf.to_string_lossy().to_string();
        let _ = std::process::Command::new("/usr/bin/hdiutil")
            .args(["detach", &mount_point, "-force"])
            .status();

        let attach_ok = std::process::Command::new("/usr/bin/hdiutil")
            .args([
                "attach",
                "-nobrowse",
                "-quiet",
                "-mountpoint",
                &mount_point,
                &dmg_path,
            ])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);

        if attach_ok {
            let copy_ok = std::process::Command::new("/bin/cp")
                .args(["-Rf", &format!("{}/DeskAura.app", mount_point), "/Applications/"])
                .status()
                .map(|s| s.success())
                .unwrap_or(false);

            let _ = std::process::Command::new("/usr/bin/hdiutil")
                .args(["detach", &mount_point, "-force"])
                .status();

            // Immediate Phase 1 Cleanup: remove temporary DMG once extracted into /Applications
            let _ = std::fs::remove_file(&dmg_path_buf);

            if copy_ok {
                return Ok("staged_macos_app".to_string());
            }
        }

        let _ = std::fs::remove_file(&dmg_path_buf);
        return Err("stage_copy_failed".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let temp_dir = std::env::temp_dir();
        let staged_ai = temp_dir.join(format!("deskaura_staged_{}.AppImage", clean_ver));
        let staged_str = staged_ai.to_string_lossy().to_string();
        let ai_url = format!(
            "https://github.com/duongbirken2510/deskaura/releases/download/v{0}/DeskAura_{0}_amd64.AppImage",
            clean_ver
        );

        let dl_ok = std::process::Command::new("curl")
            .args(["-fL", "-sS", "-o", &staged_str, &ai_url])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);

        if dl_ok && is_valid_binary_payload(&staged_ai, 2_000_000) {
            let _ = std::fs::set_permissions(&staged_ai, std::fs::Permissions::from_mode(0o755));
            if let Ok(appimage_env) = std::env::var("APPIMAGE") {
                if !appimage_env.trim().is_empty() {
                    let target_path = std::path::PathBuf::from(&appimage_env);
                    let old_path = target_path.with_extension("old.AppImage");
                    let _ = std::fs::remove_file(&old_path);
                    if std::fs::rename(&target_path, &old_path).is_ok() {
                        if std::fs::copy(&staged_ai, &target_path).is_ok() {
                            let _ = std::fs::set_permissions(
                                &target_path,
                                std::fs::Permissions::from_mode(0o755),
                            );
                            let _ = std::fs::remove_file(&staged_ai);
                            return Ok("staged_linux_appimage".to_string());
                        } else {
                            let _ = std::fs::rename(&old_path, &target_path);
                        }
                    }
                }
            }
            return Ok("staged_linux_temp".to_string());
        }
        let _ = std::fs::remove_file(&staged_ai);
        return Err("not_ready_yet".to_string());
    }

    #[allow(unreachable_code)]
    Ok("unsupported_os".to_string())
}

/// Phase 2 of Chrome/VSCode Silent OTA: Instantly restarts into the pre-staged update (< 1-2s).
#[tauri::command]
async fn download_and_install_update(app: AppHandle, version: String) -> Result<String, String> {
    let _clean_ver: String = version
        .trim()
        .trim_start_matches('v')
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '-')
        .collect();

    #[cfg(target_os = "windows")]
    {
        let clean_ver = _clean_ver;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // If In-Place Binary Swap was already staged, current_exe IS the new version! Relaunch it immediately.
        if let Ok(current_exe) = std::env::current_exe() {
            let old_exe = current_exe.with_extension("old.exe");
            if old_exe.exists() {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.destroy();
                }
                let _ = std::process::Command::new(&current_exe)
                    .arg("--relaunch-after-update")
                    .spawn();
                let app_clone = app.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(150));
                    app_clone.exit(0);
                });
                return Ok("restarting_swapped_exe".to_string());
            }
        }

        // Check if silent installer was staged in %TEMP%
        let temp_dir = std::env::temp_dir();
        let installer_path = temp_dir.join(format!("DeskAura_{}_x64-setup.exe", clean_ver));
        if !installer_path.exists() {
            let _ = stage_silent_update(clean_ver.clone()).await;
            if let Ok(current_exe) = std::env::current_exe() {
                if current_exe.with_extension("old.exe").exists() {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.destroy();
                    }
                    let _ = std::process::Command::new(&current_exe)
                        .arg("--relaunch-after-update")
                        .spawn();
                    let app_clone = app.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(150));
                        app_clone.exit(0);
                    });
                    return Ok("restarting_swapped_exe".to_string());
                }
            }
        }

        if installer_path.exists() {
            let installer_str = installer_path.to_string_lossy().to_string();
            let _ = std::process::Command::new(&installer_str)
                .arg("/S")
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
            let app_clone = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(400));
                app_clone.exit(0);
            });
            return Ok("started_silent_installer".to_string());
        }

        return Err("Gói cập nhật đang được tải ngầm, vui lòng thử lại sau ít giây.".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        // /Applications/DeskAura.app was already updated in background by stage_silent_update!
        let _ = std::process::Command::new("/bin/sh")
            .args(["-c", "sleep 0.6 && open -a /Applications/DeskAura.app"])
            .spawn();
        let app_clone = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(300));
            app_clone.exit(0);
        });
        return Ok("restarting_macos_app".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        let clean_ver = _clean_ver;
        if let Ok(appimage_env) = std::env::var("APPIMAGE") {
            if !appimage_env.trim().is_empty() {
                let target_path = std::path::PathBuf::from(&appimage_env);
                if target_path.exists() {
                    let _ = std::process::Command::new(&target_path).spawn();
                    let app_clone = app.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(300));
                        app_clone.exit(0);
                    });
                    return Ok("restarting_linux_appimage".to_string());
                }
            }
        }
        let staged_ai = std::env::temp_dir().join(format!("deskaura_staged_{}.AppImage", clean_ver));
        if staged_ai.exists() {
            let _ = std::process::Command::new(&staged_ai).spawn();
            let app_clone = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(300));
                app_clone.exit(0);
            });
            return Ok("restarting_staged_appimage".to_string());
        }
        let _ = open_in_system_browser(format!(
            "https://github.com/duongbirken2510/deskaura/releases/tag/v{}",
            clean_ver
        ));
        return Ok("opened_linux_release_page".to_string());
    }

    #[allow(unreachable_code)]
    Ok("unsupported_os".to_string())
}

#[tauri::command]
fn hide_web_music_player(app: AppHandle) {
    if let Some(existing) = app.get_webview_window("music-player") {
        let _ = existing.hide();
        let _ = app.emit("zing-window-state", "hidden_playing");
    }
}

#[tauri::command]
fn close_web_music_player(app: AppHandle) {
    if let Some(existing) = app.get_webview_window("music-player") {
        let _ = existing.destroy();
        let _ = app.emit("zing-window-state", "closed");
    }
}

#[tauri::command]
fn control_web_music_player(app: AppHandle, action: String, value: Option<f32>) -> Result<bool, String> {
    Ok(execute_zing_action(&app, &action, value))
}

#[tauri::command]
fn get_autostart_status() -> bool {
    autostart::is_autostart_enabled()
}

#[tauri::command]
fn set_autostart_status(enabled: bool, minimized: bool) -> Result<bool, String> {
    autostart::set_autostart(enabled, minimized)
}

#[tauri::command]
fn show_and_focus_window(app: AppHandle, always_on_top: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_always_on_top(always_on_top);
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn set_window_always_on_top(app: AppHandle, always_on_top: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(always_on_top);
    }
}

#[tauri::command]
fn hide_to_tray(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

/// Renders the 32x32 Liquid-Fill Water Droplet icon for the System Tray / Menu Bar (Option A).
fn render_tray_pie_icon(progress_ratio: f32, is_eye_cue: bool, is_deferred_alert: bool) -> Vec<u8> {
    let size: usize = 32;
    let mut rgba = vec![0u8; size * size * 4];
    let cx = 15.5_f32;
    let y_top = 2.5_f32;
    let y_equator = 19.5_f32;
    let r_belly = 9.8_f32;

    let fill_ratio = if is_deferred_alert || is_eye_cue {
        0.92_f32
    } else {
        progress_ratio.clamp(0.15, 1.0)
    };
    // Liquid rises from bottom (y=28.8) to top tip (y=3.5)
    let base_fill_y = 28.8_f32 - fill_ratio * (28.8_f32 - 3.5_f32);

    for y in 0..size {
        for x in 0..size {
            let xf = x as f32;
            let yf = y as f32;
            let dx = (xf - cx).abs();

            // Compute signed distance inside the water droplet silhouette
            let inside_dist = if yf >= y_top && yf <= y_equator {
                let t = ((yf - y_top) / (y_equator - y_top)).clamp(0.0, 1.0);
                // Smooth C1-continuous teardrop curve joining circle of radius r_belly at t=1.0
                let half_w = r_belly * (1.5 * t - 0.5 * t * t * t);
                half_w - dx
            } else if yf > y_equator && yf <= 30.5 {
                let dy_belly = yf - y_equator;
                let dist_belly = ((xf - cx) * (xf - cx) + dy_belly * dy_belly).sqrt();
                r_belly - dist_belly
            } else {
                -10.0
            };

            if inside_dist > -0.65 {
                let idx = (y * size + x) * 4;
                let outer_aa = (inside_dist + 0.65).clamp(0.0, 1.0);
                let border_w = 1.75_f32;

                // Gentle wave along the liquid surface
                let wave = 0.6 * ((xf * 0.42).sin());
                let fill_y = base_fill_y + wave;

                if inside_dist < border_w {
                    // Crisp Droplet Outline Border
                    let (br, bg, bb) = if is_deferred_alert {
                        (239u8, 68u8, 68u8) // Ruby Red (#EF4444)
                    } else if is_eye_cue {
                        (245u8, 158u8, 11u8) // Amber Gold (#F59E0B)
                    } else {
                        (14u8, 165u8, 233u8) // Sky Blue (#0EA5E9)
                    };
                    rgba[idx] = br;
                    rgba[idx + 1] = bg;
                    rgba[idx + 2] = bb;
                    rgba[idx + 3] = (255.0 * outer_aa) as u8;
                } else if yf >= fill_y - 0.5 {
                    // Rising Liquid Fill inside the Droplet
                    let wave_aa = ((yf - (fill_y - 0.5)).clamp(0.0, 1.0)).max(0.25);
                    let v_grad = ((29.0 - yf) / 25.0).clamp(0.0, 1.0);

                    let (mut lr, mut lg, mut lb) = if is_deferred_alert {
                        // Ruby Red Liquid
                        (
                            (220.0 + 28.0 * v_grad) as u8,
                            (38.0 + 60.0 * v_grad) as u8,
                            (38.0 + 60.0 * v_grad) as u8,
                        )
                    } else if is_eye_cue {
                        // Golden Amber Liquid
                        (
                            (217.0 + 34.0 * v_grad) as u8,
                            (119.0 + 72.0 * v_grad) as u8,
                            (6.0 + 30.0 * v_grad) as u8,
                        )
                    } else {
                        // DeskAura Ocean Sky -> Emerald Teal Gradient
                        (
                            (2.0 + 18.0 * v_grad) as u8,
                            (132.0 + 58.0 * v_grad) as u8,
                            (199.0 + 35.0 * (1.0 - v_grad)) as u8,
                        )
                    };

                    // Glossy 3D specular highlight on the left curve of the droplet
                    if xf < cx - 2.2
                        && inside_dist > 2.4
                        && inside_dist < 4.3
                        && yf > 13.5
                        && yf < 24.5
                    {
                        lr = ((lr as u16 + 255) / 2) as u8;
                        lg = ((lg as u16 + 255) / 2) as u8;
                        lb = ((lb as u16 + 255) / 2) as u8;
                    }

                    rgba[idx] = lr;
                    rgba[idx + 1] = lg;
                    rgba[idx + 2] = lb;
                    rgba[idx + 3] = (250.0 * outer_aa * wave_aa) as u8;
                } else {
                    // Unfilled upper glass cavity of the droplet
                    rgba[idx] = 186;
                    rgba[idx + 1] = 230;
                    rgba[idx + 2] = 253;
                    rgba[idx + 3] = (70.0 * outer_aa) as u8;
                }
            }
        }
    }
    rgba
}

#[tauri::command]
fn update_tray_progress_icon(
    app: AppHandle,
    progress_ratio: f32,
    is_eye_cue: bool,
    is_deferred_alert: Option<bool>,
    tooltip: String,
) {
    use std::sync::{Mutex, OnceLock};
    static LAST_TRAY_CACHE: OnceLock<Mutex<(i32, bool, bool, String)>> = OnceLock::new();

    if let Some(tray) = app.tray_by_id("main-tray") {
        let deferred = is_deferred_alert.unwrap_or(false);
        let quantized = (progress_ratio.clamp(0.0, 1.0) * 100.0).round() as i32;
        let cache = LAST_TRAY_CACHE.get_or_init(|| Mutex::new((-1, false, false, String::new())));

        let mut need_icon = true;
        let mut need_tooltip = !tooltip.is_empty();

        if let Ok(mut guard) = cache.lock() {
            if guard.0 == quantized && guard.1 == is_eye_cue && guard.2 == deferred {
                need_icon = false;
            } else {
                guard.0 = quantized;
                guard.1 = is_eye_cue;
                guard.2 = deferred;
            }
            if guard.3 == tooltip {
                need_tooltip = false;
            } else if !tooltip.is_empty() {
                guard.3 = tooltip.clone();
            }
        }

        if need_icon {
            let rgba = render_tray_pie_icon(progress_ratio, is_eye_cue, deferred);
            let img = tauri::image::Image::new_owned(rgba, 32, 32);
            let _ = tray.set_icon(Some(img));
            #[cfg(target_os = "macos")]
            {
                let _ = tray.set_icon_as_template(false);
            }
        }
        if need_tooltip {
            let _ = tray.set_tooltip(Some(&tooltip));
        }
    }
}

#[tauri::command]
fn set_screen_eye_filter(brightness: f32, warmth: f32, fade_ms: u64) {
    screen_filter::transition_screen_filter(brightness, warmth, fade_ms);
}

#[tauri::command]
fn broadcast_lan_pulse(
    room_key: String,
    device_id: String,
    device_name: String,
    next_standup_at: Option<u64>,
    next_eye_at: Option<u64>,
    next_water_at: Option<u64>,
) -> bool {
    lan_sync::broadcast_lan_pulse(
        room_key,
        device_id,
        device_name,
        next_standup_at,
        next_eye_at,
        next_water_at,
    )
}

#[tauri::command]
fn send_tray_notification(app: AppHandle, title: String, body: String) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.request_user_attention(Some(tauri::UserAttentionType::Informational));
    }
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(&format!("{title} — {body}")));
    }
    #[cfg(target_os = "macos")]
    {
        let safe_title = title.replace('"', "\\\"");
        let safe_body = body.replace('"', "\\\"");
        let script = format!(
            "display notification \"{}\" with title \"{}\"",
            safe_body, safe_title
        );
        let _ = std::process::Command::new("osascript")
            .args(["-e", &script])
            .spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("notify-send")
            .args(["--app-name=DeskAura", &title, &body])
            .spawn();
    }
}

fn build_tray_menu(app: &AppHandle, lang: &str) -> tauri::Result<Menu<tauri::Wry>> {
    let is_en = lang == "en";

    let item_open = MenuItem::with_id(
        app,
        "open",
        if is_en {
            "🌱 Open DeskAura Dashboard"
        } else {
            "🌱 Mở bảng điều khiển DeskAura"
        },
        true,
        None::<&str>,
    )?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let item_water = MenuItem::with_id(
        app,
        "water_200",
        if is_en {
            "💧 Log 1 Cup of Water (+200ml)"
        } else {
            "💧 Đã uống 1 cốc nước (+200ml)"
        },
        true,
        None::<&str>,
    )?;
    let item_break = MenuItem::with_id(
        app,
        "stand_now",
        if is_en {
            "🧘 Take a Stand-up Break Now"
        } else {
            "🧘 Nghỉ đứng dậy vươn vai ngay"
        },
        true,
        None::<&str>,
    )?;
    let item_eye_shield = MenuItem::with_id(
        app,
        "toggle_eye_shield",
        if is_en {
            "🛡️ Toggle Eye-Shield (Screen Filter / Color-Safe)"
        } else {
            "🛡️ Bật / Tắt Bảo vệ mắt (Lọc sáng / Chuẩn màu)"
        },
        true,
        None::<&str>,
    )?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let item_music = MenuItem::with_id(
        app,
        "toggle_music",
        if is_en {
            "⏯️ Play / Pause Music (Zing MP3 & Ambient)"
        } else {
            "⏯️ Phát / Tạm dừng nhạc (Zing MP3 & Nhạc nền)"
        },
        true,
        None::<&str>,
    )?;
    let item_zing_next = MenuItem::with_id(
        app,
        "zing_next",
        if is_en {
            "⏭️ Next Track on Zing MP3"
        } else {
            "⏭️ Chuyển bài tiếp theo (Zing MP3)"
        },
        true,
        None::<&str>,
    )?;
    let item_zing_window = MenuItem::with_id(
        app,
        "zing_toggle_win",
        if is_en {
            "🎶 Show / Hide Zing MP3 Window"
        } else {
            "🎶 Hiện / Ẩn cửa sổ Zing MP3"
        },
        true,
        None::<&str>,
    )?;
    let item_stop_all = MenuItem::with_id(
        app,
        "stop_all_music",
        if is_en {
            "🔇 Stop All Music Completely"
        } else {
            "🔇 Tắt hẳn toàn bộ nhạc (Zing & Nhạc nền)"
        },
        true,
        None::<&str>,
    )?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let item_quit = MenuItem::with_id(
        app,
        "quit",
        if is_en {
            "❌ Quit DeskAura"
        } else {
            "❌ Thoát hoàn toàn ứng dụng"
        },
        true,
        None::<&str>,
    )?;

    Menu::with_items(
        app,
        &[
            &item_open,
            &sep1,
            &item_water,
            &item_break,
            &item_eye_shield,
            &sep2,
            &item_music,
            &item_zing_next,
            &item_zing_window,
            &item_stop_all,
            &sep3,
            &item_quit,
        ],
    )
}

#[tauri::command]
fn set_tray_language(app: AppHandle, lang: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        if let Ok(new_menu) = build_tray_menu(&app, &lang) {
            let _ = tray.set_menu(Some(new_menu));
        }
        let tooltip = if lang == "en" {
            "DeskAura — Smart Office Wellness & Ambient Focus Companion"
        } else {
            "DeskAura — Chăm sóc sức khỏe & Nhạc nền văn phòng"
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn ensure_single_instance_or_focus_existing() -> bool {
    if std::env::args().any(|a| a == "--relaunch-after-update") {
        std::thread::sleep(std::time::Duration::from_millis(600));
        return true;
    }
    use windows::core::w;
    use windows::Win32::UI::WindowsAndMessaging::{
        FindWindowW, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
    };

    unsafe {
        if let Ok(hwnd) = FindWindowW(
            None,
            w!("DeskAura — Trợ Lý Sức Khỏe & Nhạc Nền Văn Phòng"),
        ) {
            if !hwnd.0.is_null() {
                let _ = ShowWindow(hwnd, SW_SHOW);
                let _ = ShowWindow(hwnd, SW_RESTORE);
                let _ = SetForegroundWindow(hwnd);
                return false;
            }
        }
    }
    true
}

#[cfg(not(target_os = "windows"))]
fn ensure_single_instance_or_focus_existing() -> bool {
    true
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if !ensure_single_instance_or_focus_existing() {
        return;
    }

    tauri::Builder::default()
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            let start_minimized = args.iter().any(|arg| arg == "--minimized" || arg == "-m");

            if start_minimized {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.hide();
                }
            }

            let tray_menu = build_tray_menu(app.handle(), "vi")?;

            let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                .tooltip("DeskAura — Chăm sóc sức khỏe & Nhạc nền văn phòng")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                    "water_200" => {
                        let _ = app.emit("tray-add-water", 200);
                    }
                    "stand_now" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                        let _ = app.emit("tray-trigger-break", "standup");
                    }
                    "toggle_eye_shield" => {
                        let _ = app.emit("tray-toggle-eye-shield", ());
                    }
                    "toggle_music" => {
                        // 1. If Zing MP3 window exists, toggle its Play/Pause directly!
                        let has_zing = execute_zing_action(app, "play_pause", None);
                        // 2. Also notify main window to toggle ambient/radio sounds
                        let _ = app.emit("tray-toggle-music", has_zing);
                    }
                    "zing_next" => {
                        execute_zing_action(app, "next", None);
                    }
                    "zing_toggle_win" => {
                        if let Some(music_win) = app.get_webview_window("music-player") {
                            if music_win.is_visible().unwrap_or(false) {
                                let _ = music_win.hide();
                                let _ = app.emit("zing-window-state", "hidden_playing");
                            } else {
                                let _ = music_win.show();
                                let _ = music_win.unminimize();
                                let _ = music_win.set_focus();
                                let _ = app.emit("zing-window-state", "visible");
                            }
                        } else {
                            let _ = app.emit("tray-open-zing", ());
                        }
                    }
                    "stop_all_music" => {
                        // Destroy Zing MP3 player and stop all internal ambient/radio sounds
                        if let Some(music_win) = app.get_webview_window("music-player") {
                            let _ = music_win.destroy();
                        }
                        let _ = app.emit("zing-window-state", "closed");
                        let _ = app.emit("tray-stop-all-music", ());
                    }
                    "quit" => {
                        let _ = audio_ducker::restore_other_applications();
                        screen_filter::restore_default_display();
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder.build(app)?;

            cleanup_old_update_files();
            lan_sync::start_lan_listener(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    let _ = window.emit("app-minimized-to-tray", ());
                } else if window.label() == "music-player" {
                    api.prevent_close();
                    let _ = window.hide();
                    let _ = window.app_handle().emit("zing-window-state", "hidden_playing");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system_context,
            get_hardware_device_info,
            start_google_oauth_loopback,
            duck_other_apps,
            restore_other_apps,
            open_web_music_player,
            hide_web_music_player,
            close_web_music_player,
            control_web_music_player,
            open_in_system_browser,
            stage_silent_update,
            download_and_install_update,
            get_autostart_status,
            set_autostart_status,
            show_and_focus_window,
            set_window_always_on_top,
            hide_to_tray,
            update_tray_progress_icon,
            set_screen_eye_filter,
            broadcast_lan_pulse,
            send_tray_notification,
            set_tray_language
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
