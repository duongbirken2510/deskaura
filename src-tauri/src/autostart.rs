#[cfg(target_os = "windows")]
const RUN_KEY_PATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
#[cfg(target_os = "windows")]
const APP_REG_NAME: &str = "DeskAuraOfficeWellness";

#[cfg(target_os = "windows")]
pub fn is_autostart_enabled() -> bool {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(RUN_KEY_PATH, KEY_READ) {
        let val: Result<String, _> = run_key.get_value(APP_REG_NAME);
        return val.is_ok();
    }
    false
}

#[cfg(target_os = "windows")]
pub fn set_autostart(enabled: bool, minimized: bool) -> Result<bool, String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) = hkcu
        .create_subkey(RUN_KEY_PATH)
        .map_err(|e| format!("Không thể mở Registry: {e}"))?;

    if enabled {
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Không thể lấy đường dẫn ứng dụng: {e}"))?;
        let exe_str = exe_path.to_string_lossy();
        let cmd = if minimized {
            format!("\"{}\" --minimized", exe_str)
        } else {
            format!("\"{}\"", exe_str)
        };
        run_key
            .set_value(APP_REG_NAME, &cmd)
            .map_err(|e| format!("Không thể ghi Registry khởi động cùng Windows: {e}"))?;
        Ok(true)
    } else {
        let _ = run_key.delete_value(APP_REG_NAME);
        Ok(false)
    }
}

#[cfg(target_os = "macos")]
fn get_macos_launch_agent_path() -> Option<std::path::PathBuf> {
    let home = std::env::var_os("HOME")?;
    Some(
        std::path::PathBuf::from(home)
            .join("Library")
            .join("LaunchAgents")
            .join("com.deskaura.officewellness.plist"),
    )
}

#[cfg(target_os = "macos")]
pub fn is_autostart_enabled() -> bool {
    if let Some(plist_path) = get_macos_launch_agent_path() {
        return plist_path.exists();
    }
    false
}

#[cfg(target_os = "macos")]
pub fn set_autostart(enabled: bool, minimized: bool) -> Result<bool, String> {
    let plist_path = get_macos_launch_agent_path()
        .ok_or_else(|| "Không tìm thấy thư mục HOME trên macOS".to_string())?;

    if enabled {
        if let Some(parent) = plist_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Không thể tạo thư mục LaunchAgents: {e}"))?;
        }
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Không thể lấy đường dẫn ứng dụng: {e}"))?;
        let exe_str = exe_path.to_string_lossy();
        let args_xml = if minimized {
            format!(
                "<string>{}</string>\n        <string>--minimized</string>",
                exe_str
            )
        } else {
            format!("<string>{}</string>", exe_str)
        };
        let plist_content = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.deskaura.officewellness</string>
    <key>ProgramArguments</key>
    <array>
        {args_xml}
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
"#
        );
        std::fs::write(&plist_path, plist_content)
            .map_err(|e| format!("Không thể ghi file LaunchAgent: {e}"))?;
        Ok(true)
    } else {
        if plist_path.exists() {
            let _ = std::fs::remove_file(&plist_path);
        }
        Ok(false)
    }
}

#[cfg(target_os = "linux")]
fn get_linux_autostart_desktop_path() -> Option<std::path::PathBuf> {
    if let Some(config_home) = std::env::var_os("XDG_CONFIG_HOME") {
        return Some(
            std::path::PathBuf::from(config_home)
                .join("autostart")
                .join("deskaura.desktop"),
        );
    }
    let home = std::env::var_os("HOME")?;
    Some(
        std::path::PathBuf::from(home)
            .join(".config")
            .join("autostart")
            .join("deskaura.desktop"),
    )
}

#[cfg(target_os = "linux")]
pub fn is_autostart_enabled() -> bool {
    if let Some(desktop_path) = get_linux_autostart_desktop_path() {
        return desktop_path.exists();
    }
    false
}

#[cfg(target_os = "linux")]
pub fn set_autostart(enabled: bool, minimized: bool) -> Result<bool, String> {
    let desktop_path = get_linux_autostart_desktop_path()
        .ok_or_else(|| "Không tìm thấy thư mục ~/.config/autostart trên Linux".to_string())?;

    if enabled {
        if let Some(parent) = desktop_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Không thể tạo thư mục autostart trên Linux: {e}"))?;
        }
        // Prefer APPIMAGE outer path if running from an AppImage, otherwise current_exe()
        let exe_str = if let Ok(appimage) = std::env::var("APPIMAGE") {
            if !appimage.trim().is_empty() {
                appimage
            } else {
                std::env::current_exe()
                    .map_err(|e| format!("Không thể lấy đường dẫn ứng dụng: {e}"))?
                    .to_string_lossy()
                    .to_string()
            }
        } else {
            std::env::current_exe()
                .map_err(|e| format!("Không thể lấy đường dẫn ứng dụng: {e}"))?
                .to_string_lossy()
                .to_string()
        };

        let exec_line = if minimized {
            format!("\"{}\" --minimized", exe_str)
        } else {
            format!("\"{}\"", exe_str)
        };

        let desktop_content = format!(
            "[Desktop Entry]\nType=Application\nName=DeskAura\nComment=Smart Office Wellness & Ambient Focus Companion\nExec={exec_line}\nTerminal=false\nStartupNotify=false\nX-GNOME-Autostart-enabled=true\n"
        );
        std::fs::write(&desktop_path, desktop_content)
            .map_err(|e| format!("Không thể ghi file deskaura.desktop: {e}"))?;
        Ok(true)
    } else {
        if desktop_path.exists() {
            let _ = std::fs::remove_file(&desktop_path);
        }
        Ok(false)
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub fn is_autostart_enabled() -> bool {
    false
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub fn set_autostart(_enabled: bool, _minimized: bool) -> Result<bool, String> {
    Ok(false)
}
