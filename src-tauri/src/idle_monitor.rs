#[cfg(target_os = "windows")]
pub fn get_idle_seconds() -> u64 {
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    unsafe {
        let mut lii = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };
        if GetLastInputInfo(&mut lii).as_bool() {
            let now = GetTickCount();
            let elapsed_ms = now.wrapping_sub(lii.dwTime);
            return (elapsed_ms / 1000) as u64;
        }
    }
    0
}

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state_id: i32, event_type: u32) -> f64;
}

#[cfg(target_os = "macos")]
pub fn get_idle_seconds() -> u64 {
    // kCGEventSourceStateCombinedSessionState = 0, kCGAnyInputEventType = u32::MAX (~0)
    // Native C FFI call (<0.001ms, 0 child processes spawned vs spawning `ioreg` every 3s)
    unsafe {
        let secs = CGEventSourceSecondsSinceLastEventType(0, u32::MAX);
        if secs.is_finite() && secs >= 0.0 {
            return secs as u64;
        }
    }
    0
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn get_idle_seconds() -> u64 {
    0
}

#[cfg(target_os = "windows")]
pub fn is_fullscreen_active() -> bool {
    use windows::Win32::Foundation::RECT;
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowRect,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return false;
        }
        if hwnd == GetDesktopWindow() || hwnd == GetShellWindow() {
            return false;
        }

        let mut win_rect = RECT::default();
        if GetWindowRect(hwnd, &mut win_rect).is_err() {
            return false;
        }

        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if monitor.0.is_null() {
            return false;
        }

        let mut mon_info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(monitor, &mut mon_info).as_bool() {
            return false;
        }

        let rc = mon_info.rcMonitor;
        win_rect.left <= rc.left
            && win_rect.top <= rc.top
            && win_rect.right >= rc.right
            && win_rect.bottom >= rc.bottom
    }
}

#[cfg(target_os = "macos")]
pub fn is_fullscreen_active() -> bool {
    use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static LAST_CHECK_SEC: AtomicU64 = AtomicU64::new(0);
    static CACHED_FULLSCREEN: AtomicBool = AtomicBool::new(false);

    let now_sec = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let prev = LAST_CHECK_SEC.load(Ordering::Relaxed);
    if now_sec.saturating_sub(prev) < 5 {
        return CACHED_FULLSCREEN.load(Ordering::Relaxed);
    }
    LAST_CHECK_SEC.store(now_sec, Ordering::Relaxed);

    // Permission-free macOS check if frontmost app is in Full-Screen or Presentation Mode via lsappinfo
    if let Ok(front_out) = std::process::Command::new("/usr/bin/lsappinfo")
        .arg("front")
        .output()
    {
        let front_asn = String::from_utf8_lossy(&front_out.stdout).trim().to_string();
        if !front_asn.is_empty() {
            if let Ok(info_out) = std::process::Command::new("/usr/bin/lsappinfo")
                .args(["info", "-only", "PresentationMode", &front_asn])
                .output()
            {
                let text = String::from_utf8_lossy(&info_out.stdout);
                let is_fs = text.contains("UIPresentationMode") && !text.contains("\"Normal\"");
                CACHED_FULLSCREEN.store(is_fs, Ordering::Relaxed);
                return is_fs;
            }
        }
    }

    false
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn is_fullscreen_active() -> bool {
    false
}

