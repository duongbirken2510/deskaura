#[cfg(target_os = "windows")]
use std::collections::HashMap;
#[cfg(target_os = "windows")]
use std::sync::{Mutex, OnceLock};

#[cfg(target_os = "windows")]
static SAVED_VOLUMES: OnceLock<Mutex<HashMap<u32, f32>>> = OnceLock::new();

#[cfg(target_os = "windows")]
fn get_volume_store() -> &'static Mutex<HashMap<u32, f32>> {
    SAVED_VOLUMES.get_or_init(|| Mutex::new(HashMap::new()))
}

#[cfg(target_os = "windows")]
pub fn duck_other_applications(target_ratio: f32) -> Result<usize, String> {
    use windows::core::Interface;
    use windows::Win32::Media::Audio::{
        eMultimedia, eRender, IAudioSessionControl2, IAudioSessionEnumerator,
        IAudioSessionManager2, IMMDeviceEnumerator, ISimpleAudioVolume, MMDeviceEnumerator,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
    };

    let ratio = target_ratio.clamp(0.05, 1.0);
    let current_pid = std::process::id();
    let mut ducked_count = 0usize;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create MMDeviceEnumerator: {e}"))?;

        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .map_err(|e| format!("Failed to get default audio endpoint: {e}"))?;

        let manager: IAudioSessionManager2 = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Failed to activate IAudioSessionManager2: {e}"))?;

        let session_enum: IAudioSessionEnumerator = manager
            .GetSessionEnumerator()
            .map_err(|e| format!("Failed to get session enumerator: {e}"))?;

        let count = session_enum
            .GetCount()
            .map_err(|e| format!("Failed to get session count: {e}"))?;

        let mut store = get_volume_store()
            .lock()
            .map_err(|_| "Mutex poisoned".to_string())?;

        for i in 0..count {
            if let Ok(control) = session_enum.GetSession(i) {
                if let Ok(control2) = control.cast::<IAudioSessionControl2>() {
                    if let Ok(pid) = control2.GetProcessId() {
                        // Skip system sounds (pid 0) and our own app process
                        if pid != 0 && pid != current_pid {
                            if let Ok(simple_vol) = control.cast::<ISimpleAudioVolume>() {
                                if let Ok(current_vol) = simple_vol.GetMasterVolume() {
                                    // Only lowered if volume is noticeably audible
                                    if current_vol > 0.02 {
                                        let orig_vol = *store.entry(pid).or_insert(current_vol);
                                        let new_vol = (orig_vol * ratio).clamp(0.02, orig_vol);
                                        if simple_vol
                                            .SetMasterVolume(new_vol, std::ptr::null())
                                            .is_ok()
                                        {
                                            ducked_count += 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(ducked_count)
}

#[cfg(not(target_os = "windows"))]
pub fn duck_other_applications(_target_ratio: f32) -> Result<usize, String> {
    Ok(0)
}

#[cfg(target_os = "windows")]
pub fn restore_other_applications() -> Result<usize, String> {
    use windows::core::Interface;
    use windows::Win32::Media::Audio::{
        eMultimedia, eRender, IAudioSessionControl2, IAudioSessionEnumerator,
        IAudioSessionManager2, IMMDeviceEnumerator, ISimpleAudioVolume, MMDeviceEnumerator,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
    };

    let mut restored_count = 0usize;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let mut store = get_volume_store()
            .lock()
            .map_err(|_| "Mutex poisoned".to_string())?;

        if store.is_empty() {
            return Ok(0);
        }

        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create MMDeviceEnumerator: {e}"))?;

        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .map_err(|e| format!("Failed to get default audio endpoint: {e}"))?;

        let manager: IAudioSessionManager2 = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Failed to activate IAudioSessionManager2: {e}"))?;

        let session_enum: IAudioSessionEnumerator = manager
            .GetSessionEnumerator()
            .map_err(|e| format!("Failed to get session enumerator: {e}"))?;

        let count = session_enum
            .GetCount()
            .map_err(|e| format!("Failed to get session count: {e}"))?;

        for i in 0..count {
            if let Ok(control) = session_enum.GetSession(i) {
                if let Ok(control2) = control.cast::<IAudioSessionControl2>() {
                    if let Ok(pid) = control2.GetProcessId() {
                        if let Some(&orig_vol) = store.get(&pid) {
                            if let Ok(simple_vol) = control.cast::<ISimpleAudioVolume>() {
                                if simple_vol
                                    .SetMasterVolume(orig_vol, std::ptr::null())
                                    .is_ok()
                                {
                                    restored_count += 1;
                                }
                            }
                        }
                    }
                }
            }
        }

        store.clear();
    }

    Ok(restored_count)
}

#[cfg(not(target_os = "windows"))]
pub fn restore_other_applications() -> Result<usize, String> {
    Ok(0)
}

