use winreg::enums::*;
use winreg::RegKey;

const RUN_KEY_PATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const APP_REG_NAME: &str = "DeskAuraOfficeWellness";

pub fn is_autostart_enabled() -> bool {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(RUN_KEY_PATH, KEY_READ) {
        let val: Result<String, _> = run_key.get_value(APP_REG_NAME);
        return val.is_ok();
    }
    false
}

pub fn set_autostart(enabled: bool, minimized: bool) -> Result<bool, String> {
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

