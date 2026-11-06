use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

static CURRENT_FILTER: OnceLock<Mutex<(f32, f32)>> = OnceLock::new();
static ANIM_GENERATION: AtomicU64 = AtomicU64::new(0);

fn state_store() -> &'static Mutex<(f32, f32)> {
    CURRENT_FILTER.get_or_init(|| Mutex::new((1.0, 0.0)))
}

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGGetActiveDisplayList(
        max_displays: u32,
        active_displays: *mut u32,
        display_count: *mut u32,
    ) -> i32;
    fn CGSetDisplayTransferByFormula(
        display: u32,
        red_min: f32,
        red_max: f32,
        red_gamma: f32,
        green_min: f32,
        green_max: f32,
        green_gamma: f32,
        blue_min: f32,
        blue_max: f32,
        blue_gamma: f32,
    ) -> i32;
    fn CGDisplayRestoreColorSyncSettings();
}

#[cfg(target_os = "windows")]
#[link(name = "gdi32")]
extern "system" {
    fn SetDeviceGammaRamp(hdc: *mut core::ffi::c_void, lp_ramp: *const [[u16; 256]; 3]) -> i32;
}

fn apply_hardware_rgb(r_max: f32, g_max: f32, b_max: f32) {
    let r = r_max.clamp(0.20, 1.0);
    let g = g_max.clamp(0.18, 1.0);
    let b = b_max.clamp(0.15, 1.0);

    #[cfg(target_os = "macos")]
    unsafe {
        if r >= 0.998 && g >= 0.998 && b >= 0.998 {
            CGDisplayRestoreColorSyncSettings();
            return;
        }
        let mut displays = [0u32; 16];
        let mut count = 0u32;
        if CGGetActiveDisplayList(16, displays.as_mut_ptr(), &mut count) == 0 {
            for &d in displays.iter().take(count as usize) {
                let _ = CGSetDisplayTransferByFormula(d, 0.0, r, 1.0, 0.0, g, 1.0, 0.0, b, 1.0);
            }
        }
    }

    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::Graphics::Gdi::{GetDC, ReleaseDC};

        let mut ramp = [[0u16; 256]; 3];
        for i in 0..256 {
            let base = (i as u32 * 257) as f32;
            ramp[0][i] = (base * r).clamp(0.0, 65535.0) as u16;
            ramp[1][i] = (base * g).clamp(0.0, 65535.0) as u16;
            ramp[2][i] = (base * b).clamp(0.0, 65535.0) as u16;
        }
        let hdc = GetDC(HWND(core::ptr::null_mut()));
        if !hdc.0.is_null() {
            let _ = SetDeviceGammaRamp(hdc.0, &ramp);
            let _ = ReleaseDC(HWND(core::ptr::null_mut()), hdc);
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(out) = std::process::Command::new("xrandr")
            .arg("--listmonitors")
            .output()
        {
            if out.status.success() {
                let txt = String::from_utf8_lossy(&out.stdout);
                for line in txt.lines().skip(1) {
                    if let Some(output_name) = line.split_whitespace().last() {
                        let gamma_str = format!(
                            "{:.2}:{:.2}:{:.2}",
                            (r / r.max(0.01)).clamp(0.5, 1.0),
                            (g / r.max(0.01)).clamp(0.5, 1.0),
                            (b / r.max(0.01)).clamp(0.4, 1.0)
                        );
                        let bright_str = format!("{:.2}", r);
                        let _ = std::process::Command::new("xrandr")
                            .args([
                                "--output",
                                output_name,
                                "--brightness",
                                &bright_str,
                                "--gamma",
                                &gamma_str,
                            ])
                            .output();
                    }
                }
            }
        }
    }
}

fn apply_brightness_and_warmth_step(brightness: f32, warmth: f32) {
    let b_clamped = brightness.clamp(0.25, 1.0);
    let w_clamped = warmth.clamp(0.0, 0.65);

    let r_max = b_clamped;
    let g_max = b_clamped * (1.0 - w_clamped * 0.18);
    let b_max = b_clamped * (1.0 - w_clamped * 0.55);

    apply_hardware_rgb(r_max, g_max, b_max);
}

/// Smoothly transitions screen brightness and warmth using a Cosine ease-in-out curve over `duration_ms`.
pub fn transition_screen_filter(target_brightness: f32, target_warmth: f32, duration_ms: u64) {
    let target_b = target_brightness.clamp(0.25, 1.0);
    let target_w = target_warmth.clamp(0.0, 0.65);

    let (start_b, start_w) = if let Ok(guard) = state_store().lock() {
        *guard
    } else {
        (1.0, 0.0)
    };

    if (target_b - start_b).abs() < 0.005 && (target_w - start_w).abs() < 0.005 {
        return;
    }

    let gen = ANIM_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;

    if duration_ms <= 60 {
        if let Ok(mut guard) = state_store().lock() {
            *guard = (target_b, target_w);
        }
        apply_brightness_and_warmth_step(target_b, target_w);
        return;
    }

    std::thread::spawn(move || {
        #[cfg(not(target_os = "linux"))]
        let steps = (duration_ms / 50).clamp(4, 36);
        #[cfg(target_os = "linux")]
        let steps = (duration_ms / 250).clamp(2, 6);

        let sleep_ms = duration_ms / steps;

        for step in 1..=steps {
            if ANIM_GENERATION.load(Ordering::SeqCst) != gen {
                return;
            }
            let t = step as f32 / steps as f32;
            // Cosine ease-in-out: 0.5 * (1 - cos(pi * t))
            let ease = 0.5 * (1.0 - (std::f32::consts::PI * t).cos());
            let cur_b = start_b + (target_b - start_b) * ease;
            let cur_w = start_w + (target_w - start_w) * ease;

            if let Ok(mut guard) = state_store().lock() {
                *guard = (cur_b, cur_w);
            }
            apply_brightness_and_warmth_step(cur_b, cur_w);

            if step < steps {
                std::thread::sleep(Duration::from_millis(sleep_ms));
            }
        }
    });
}

/// Immediately restores 100% color-accurate display state on exit or reset.
pub fn restore_default_display() {
    let _ = ANIM_GENERATION.fetch_add(1, Ordering::SeqCst);
    if let Ok(mut guard) = state_store().lock() {
        *guard = (1.0, 0.0);
    }
    apply_hardware_rgb(1.0, 1.0, 1.0);
}
