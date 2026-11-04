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
                const playBtn = document.querySelector('.player-controls .btn-play, .player-controls [title*="Tạm dừng"], .player-controls [title*="Phát"], button.zm-btn.ic-play-circle-outline, button.zm-btn.ic-pause-circle-outline');
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
    true
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
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url.trim())
            .spawn()
            .map_err(|e| format!("Không thể mở trình duyệt trên macOS: {e}"))?;
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
            hide_to_tray,
            send_tray_notification,
            set_tray_language
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
