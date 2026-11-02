mod audio_ducker;
mod autostart;
mod idle_monitor;

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

#[tauri::command]
fn get_system_context() -> SystemContextInfo {
    SystemContextInfo {
        idle_seconds: idle_monitor::get_idle_seconds(),
        is_fullscreen: idle_monitor::is_fullscreen_active(),
    }
}

#[tauri::command]
fn duck_other_apps(app: AppHandle, target_ratio: f32) -> Result<usize, String> {
    // Also duck built-in Zing MP3 / Web music player window if open
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
    // Restore built-in Zing MP3 / Web music player window if open
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

    let parsed: tauri::Url = target_url
        .parse()
        .map_err(|e| format!("URL không hợp lệ: {e}"))?;

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

            // LAYER 1: Block Ad-Network Requests (IMA SDK, DoubleClick, Adtima, VAST/Preroll)
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

            // Layer 3 CSS: Hide intrusive ad banners & overlay popups
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

            // LAYER 2: Smart Audio/Video Ad Detector -> Instant Mute + Fast-Forward Skip
            const isCurrentlyPlayingAd = (mediaEl) => {
                const src = (mediaEl.currentSrc || mediaEl.src || '').toLowerCase();
                if (isAdUrl(src)) return true;

                // Check if short audio ad clip (5s - 38s) injected between full songs
                const dur = mediaEl.duration;
                if (Number.isFinite(dur) && dur > 3 && dur <= 38) {
                    return true;
                }

                // Check UI text indicators for Advertisement
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
                    // Mute immediately so user never hears the ad
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

            // Auto-click any "Skip Ad / Bỏ qua quảng cáo" buttons if present
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
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url.trim()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Không thể mở trình duyệt: {e}"))?;
    }
    Ok(())
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
    let Some(music_win) = app.get_webview_window("music-player") else {
        return Ok(false);
    };

    let js = match action.as_str() {
        "play_pause" => r#"
            (function() {
                const audios = Array.from(document.querySelectorAll('audio, video'));
                const activeAudio = audios.find(a => !a.paused) || audios[0];
                if (activeAudio) {
                    if (activeAudio.paused) activeAudio.play();
                    else activeAudio.pause();
                    return;
                }
                const playBtn = document.querySelector('.player-controls .btn-play, .player-controls [title*="Tạm dừng"], .player-controls [title*="Phát"], button.zm-btn.ic-play-circle-outline, button.zm-btn.ic-pause-circle-outline');
                if (playBtn) playBtn.click();
            })();
        "#.to_string(),
        "next" => r#"
            (function() {
                const nextBtn = document.querySelector('.btn-next, [title*="Bài tiếp theo"], .ic-next');
                if (nextBtn) {
                    const btn = nextBtn.closest('button') || nextBtn;
                    btn.click();
                }
            })();
        "#.to_string(),
        "prev" => r#"
            (function() {
                const prevBtn = document.querySelector('.btn-pre, .btn-prev, [title*="Bài trước"], .ic-pre');
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
                const firstPlay = document.querySelector('button[title*="Phát tất cả"], .zm-card-image .ic-play, .media-item .ic-play, .song-thumb .ic-play');
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
    Ok(true)
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

#[cfg(target_os = "windows")]
fn ensure_single_instance_or_focus_existing() -> bool {
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
            // Check if launched with --minimized flag (e.g., on Windows boot)
            let args: Vec<String> = std::env::args().collect();
            let start_minimized = args.iter().any(|arg| arg == "--minimized" || arg == "-m");

            if start_minimized {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.hide();
                }
            }

            // Build Vietnamese System Tray Menu
            let item_open = MenuItem::with_id(
                app,
                "open",
                "🌱 Mở bảng điều khiển DeskAura",
                true,
                None::<&str>,
            )?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let item_water = MenuItem::with_id(
                app,
                "water_200",
                "💧 Đã uống 1 cốc nước (+200ml)",
                true,
                None::<&str>,
            )?;
            let item_break = MenuItem::with_id(
                app,
                "stand_now",
                "🧘 Nghỉ đứng dậy vươn vai ngay",
                true,
                None::<&str>,
            )?;
            let item_music = MenuItem::with_id(
                app,
                "toggle_music",
                "🎵 Bật / Tắt nhạc nền thư giãn",
                true,
                None::<&str>,
            )?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let item_quit = MenuItem::with_id(
                app,
                "quit",
                "❌ Thoát hoàn toàn ứng dụng",
                true,
                None::<&str>,
            )?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &item_open,
                    &sep1,
                    &item_water,
                    &item_break,
                    &item_music,
                    &sep2,
                    &item_quit,
                ],
            )?;

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
                    "toggle_music" => {
                        let _ = app.emit("tray-toggle-music", ());
                    }
                    "quit" => {
                        let _ = audio_ducker::restore_other_applications();
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

            Ok(())
        })
        .on_window_event(|window, event| {
            // Intercept close request on BOTH main and music-player windows so they hide to background and keep playing audio!
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
            duck_other_apps,
            restore_other_apps,
            open_web_music_player,
            hide_web_music_player,
            close_web_music_player,
            control_web_music_player,
            open_in_system_browser,
            get_autostart_status,
            set_autostart_status,
            show_and_focus_window,
            set_window_always_on_top,
            hide_to_tray
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

