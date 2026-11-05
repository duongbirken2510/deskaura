import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface SystemContextInfo {
  idle_seconds: number;
  is_fullscreen: boolean;
}

export interface HardwareDeviceInfo {
  hardware_id: string;
  device_name: string;
  os: string;
}

export interface LanPulsePacket {
  app: string;
  room_key: string;
  device_id: string;
  device_name: string;
  active_at: number;
  next_standup_at?: number;
  next_eye_at?: number;
  next_water_at?: number;
}

const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export async function getHardwareDeviceInfo(): Promise<HardwareDeviceInfo | null> {
  if (!isTauriEnv()) {
    return null;
  }
  try {
    return await invoke<HardwareDeviceInfo>('get_hardware_device_info');
  } catch {
    return null;
  }
}

export async function startGoogleOAuthLoopback(
  apiKey: string,
  authDomain: string,
  projectId: string
): Promise<string> {
  return await invoke<string>('start_google_oauth_loopback', {
    apiKey,
    authDomain,
    projectId,
  });
}

export async function getSystemContext(): Promise<SystemContextInfo> {
  if (!isTauriEnv()) {
    return { idle_seconds: 0, is_fullscreen: false };
  }
  try {
    return await invoke<SystemContextInfo>('get_system_context');
  } catch {
    return { idle_seconds: 0, is_fullscreen: false };
  }
}

export async function duckOtherApplications(targetRatio: number = 0.2): Promise<number> {
  if (!isTauriEnv()) {
    return 0;
  }
  try {
    return await invoke<number>('duck_other_apps', { targetRatio });
  } catch (err) {
    console.warn('WASAPI duck_other_apps warning:', err);
    return 0;
  }
}

export async function restoreOtherApplications(): Promise<number> {
  if (!isTauriEnv()) {
    return 0;
  }
  try {
    return await invoke<number>('restore_other_apps');
  } catch (err) {
    console.warn('WASAPI restore_other_apps warning:', err);
    return 0;
  }
}

export async function getAutostartStatus(): Promise<boolean> {
  if (!isTauriEnv()) {
    return false;
  }
  try {
    return await invoke<boolean>('get_autostart_status');
  } catch {
    return false;
  }
}

export async function setAutostartStatus(enabled: boolean, minimized: boolean = true): Promise<boolean> {
  if (!isTauriEnv()) {
    return enabled;
  }
  try {
    return await invoke<boolean>('set_autostart_status', { enabled, minimized });
  } catch (err) {
    console.warn('set_autostart_status warning:', err);
    return false;
  }
}

export async function showAndFocusWindow(alwaysOnTop: boolean = false): Promise<void> {
  if (!isTauriEnv()) return;
  try {
    await invoke('show_and_focus_window', { alwaysOnTop });
  } catch {
    // ignore
  }
}

export async function setWindowAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  if (!isTauriEnv()) return;
  try {
    await invoke('set_window_always_on_top', { alwaysOnTop });
  } catch {
    // ignore
  }
}

export async function hideWindowToTray(): Promise<void> {
  if (!isTauriEnv()) return;
  try {
    await invoke('hide_to_tray');
  } catch {
    // ignore
  }
}

export async function openWebMusicPlayer(url: string, title?: string): Promise<void> {
  if (!isTauriEnv()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    await invoke('open_web_music_player', { url, title });
  } catch (err) {
    console.warn('open_web_music_player warning:', err);
  }
}

export async function closeWebMusicPlayer(): Promise<void> {
  if (!isTauriEnv()) return;
  try {
    await invoke('close_web_music_player');
  } catch {
    // ignore
  }
}

export async function hideWebMusicPlayer(): Promise<void> {
  if (!isTauriEnv()) return;
  try {
    await invoke('hide_web_music_player');
  } catch {
    // ignore
  }
}

export async function controlWebMusicPlayer(
  action: 'play_pause' | 'next' | 'prev' | 'volume' | 'play_first',
  value?: number
): Promise<boolean> {
  if (!isTauriEnv()) return false;
  try {
    return await invoke<boolean>('control_web_music_player', { action, value });
  } catch {
    return false;
  }
}

export async function openInSystemBrowser(url: string): Promise<void> {
  if (!isTauriEnv()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    await invoke('open_in_system_browser', { url });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function compareSemver(a: string, b: string): number {
  const cleanA = a.trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const cleanB = b.trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(cleanA.length, cleanB.length);
  for (let i = 0; i < len; i++) {
    const va = cleanA[i] || 0;
    const vb = cleanB[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export async function fetchLatestGithubVersion(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/duongbirken2510/deskaura/main/package.json?t=${Date.now()}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.version === 'string') {
      return data.version.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export async function stageSilentUpdate(version: string): Promise<string | null> {
  if (!isTauriEnv()) return null;
  try {
    return await invoke<string>('stage_silent_update', { version });
  } catch {
    return null;
  }
}

export async function downloadAndInstallUpdate(version: string): Promise<string> {
  if (!isTauriEnv()) {
    window.open('https://github.com/duongbirken2510/deskaura', '_blank', 'noopener,noreferrer');
    return 'browser';
  }
  return await invoke<string>('download_and_install_update', { version });
}

export async function setTrayLanguage(lang: 'vi' | 'en'): Promise<void> {
  if (!isTauriEnv()) return;
  try {
    await invoke('set_tray_language', { lang });
  } catch {
    // ignore
  }
}

export async function updateTrayProgressIcon(
  progressRatio: number,
  isEyeCue: boolean,
  tooltip: string,
  isDeferredAlert: boolean = false
): Promise<void> {
  if (!isTauriEnv()) return;
  try {
    await invoke('update_tray_progress_icon', {
      progressRatio,
      isEyeCue,
      isDeferredAlert,
      tooltip,
    });
  } catch {
    // ignore
  }
}

export async function broadcastLanPulse(
  roomKey: string,
  deviceId: string,
  deviceName: string,
  nextStandupAt?: number,
  nextEyeAt?: number,
  nextWaterAt?: number
): Promise<boolean> {
  if (!isTauriEnv()) return false;
  try {
    return await invoke<boolean>('broadcast_lan_pulse', {
      roomKey,
      deviceId,
      deviceName,
      nextStandupAt,
      nextEyeAt,
      nextWaterAt,
    });
  } catch {
    return false;
  }
}

export async function sendTrayNotification(title: string, body: string): Promise<void> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    } catch {
      // ignore web notification errors
    }
  }
  if (!isTauriEnv()) return;
  try {
    await invoke('send_tray_notification', { title, body });
  } catch {
    // ignore
  }
}

export async function onTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  if (!isTauriEnv()) {
    return () => {};
  }
  try {
    return await listen<T>(eventName, (event) => {
      handler(event.payload);
    });
  } catch {
    return () => {};
  }
}

