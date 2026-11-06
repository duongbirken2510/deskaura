import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Activity,
  BarChart3,
  Bell,
  Clock,
  Coffee,
  Droplets,
  Eye,
  Headphones,
  LayoutDashboard,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CloudWellnessDocument,
  ConnectedDeviceMetadata,
  SyncConnectionStatus,
  firebaseSyncService,
  getCachedHardwareId,
  getDefaultDeviceName,
  mergeDailyStats,
  mergeWeeklyHistory,
} from './services/firebaseSync';
import { PlantMood, VirtualDeskPlant } from './components/ExerciseIllustration';
import {
  MebiusAnalyticsRow,
  MebiusDualActivityRings,
  MebiusHourlyHydrationChart,
} from './components/MebiusAnalyticsRow';

const BreakOverlayModal = React.lazy(() =>
  import('./components/BreakOverlayModal').then((m) => ({ default: m.BreakOverlayModal }))
);
const SettingsPanel = React.lazy(() =>
  import('./components/SettingsPanel').then((m) => ({ default: m.SettingsPanel }))
);
const SoundMixerPanel = React.lazy(() =>
  import('./components/SoundMixerPanel').then((m) => ({ default: m.SoundMixerPanel }))
);
import {
  AMBIENT_SOUNDS,
  PLANT_WITTY_QUOTES,
  SOUND_PRESETS,
} from './data/wellnessCatalog';
import { soundEngine } from './services/soundEngine';
import {
  LanPulsePacket,
  broadcastLanPulse,
  closeWebMusicPlayer,
  compareSemver,
  downloadAndInstallUpdate,
  fetchLatestGithubVersion,
  getAutostartStatus,
  getSystemContext,
  hideWindowToTray,
  onTauriEvent,
  openWebMusicPlayer,
  sendTrayNotification,
  setAutostartStatus,
  setScreenEyeFilter,
  setTrayLanguage,
  setWindowAlwaysOnTop,
  showAndFocusWindow,
  stageSilentUpdate,
  updateTrayProgressIcon,
} from './services/tauriBridge';
import {
  hashLanRoomKey,
  readEncryptedJson,
  writeEncryptedJson,
} from './services/localStorageCrypto';
import pkg from '../package.json';
import { AppLanguage, TRANSLATIONS } from './i18n/translations';

const CURRENT_APP_VERSION = pkg.version || '1.2.3';
import {
  BreakType,
  DailyWellnessStats,
  HydrationSettings,
  SoundId,
  StandupSettings,
  VoiceReminderSettings,
} from './types/wellness';

const STORAGE_KEYS = {
  STANDUP: 'mamxanh_standup_v1',
  HYDRATION: 'mamxanh_hydration_v1',
  VOICE: 'mamxanh_voice_v1',
  DAILY_STATS: 'mamxanh_daily_stats_v1',
  WEEKLY_HISTORY: 'deskaura_weekly_history_v1',
  LANGUAGE: 'deskaura_lang_v1',
  V12_COMBO_MIGRATED: 'deskaura_v12_combo_migrated',
  V12_IDLE180_MIGRATED: 'deskaura_v12_idle180_migrated',
};

const getTodayString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'sounds' | 'settings'>('dashboard');
  const [lang, setLang] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return saved === 'en' ? 'en' : 'vi';
  });
  const t = TRANSLATIONS[lang];

  // 1. Settings States (v1.2.3: Hardware-Bound Encrypted Storage enc:v1: with Zero-Data-Loss Migration)
  const [standupSettings, setStandupSettings] = useState<StandupSettings>(() => {
    const isV12Migrated = localStorage.getItem(STORAGE_KEYS.V12_COMBO_MIGRATED) === '1';
    const isIdle180Migrated = localStorage.getItem(STORAGE_KEYS.V12_IDLE180_MIGRATED) === '1';
    const now = Date.now();
    const defaultStandup: StandupSettings = {
      standupIntervalMinutes: 60,
      standupDurationSeconds: 180,
      eyeBreakEnabled: true,
      eyeBreakIntervalMinutes: 20,
      eyeBreakDurationSeconds: 20,
      eyeBreakDimScreen: true,
      eyeShieldEnabled: false,
      eyeShieldMode: 'auto',
      autoResetIdleSeconds: 180,
      pauseOnFullscreen: true,
      reminderMode: 'overlay',
      holdToSkip: true,
      nextStandupAt: now + 60 * 60 * 1000,
      nextEyeAt: now + 20 * 60 * 1000,
      nextWaterAt: now + 60 * 60 * 1000,
      timerSyncUpdatedAt: now,
      lastActiveAt: now,
    };
    const parsed = readEncryptedJson<StandupSettings | null>(STORAGE_KEYS.STANDUP, null);
    if (parsed) {
      if (!isV12Migrated && parsed.standupIntervalMinutes === 45) {
        parsed.standupIntervalMinutes = 60;
      }
      if (!isIdle180Migrated && (!parsed.autoResetIdleSeconds || parsed.autoResetIdleSeconds === 300)) {
        parsed.autoResetIdleSeconds = 180;
        localStorage.setItem(STORAGE_KEYS.V12_IDLE180_MIGRATED, '1');
      }
      return parsed;
    }
    localStorage.setItem(STORAGE_KEYS.V12_IDLE180_MIGRATED, '1');
    return defaultStandup;
  });

  const [hydrationSettings, setHydrationSettings] = useState<HydrationSettings>(() => {
    const isV12Migrated = localStorage.getItem(STORAGE_KEYS.V12_COMBO_MIGRATED) === '1';
    const defaultHydration: HydrationSettings = {
      dailyGoalMl: 1800,
      weightKg: 60,
      intervalMinutes: 60,
      quickAmounts: [100, 200, 300],
    };
    const parsed = readEncryptedJson<HydrationSettings | null>(STORAGE_KEYS.HYDRATION, null);
    if (parsed) {
      if (!isV12Migrated && parsed.intervalMinutes === 40) {
        parsed.intervalMinutes = 60;
      }
      localStorage.setItem(STORAGE_KEYS.V12_COMBO_MIGRATED, '1');
      return parsed;
    }
    localStorage.setItem(STORAGE_KEYS.V12_COMBO_MIGRATED, '1');
    return defaultHydration;
  });

  const [voiceSettings, setVoiceSettings] = useState<VoiceReminderSettings>(() => {
    const defaultVoice: VoiceReminderSettings = {
      enabled: true,
      voicePack: 'female_neural',
      volume: 0.9,
      duckOtherApps: true,
      duckRatio: 0.2,
      playChimeBeforeVoice: true,
      customStandupText:
        'Bạn đã ngồi làm việc khá lâu rồi, hãy đứng dậy vươn vai và đi lại một chút nhé!',
      customWaterText:
        'Đến giờ bổ sung nước rồi, bạn hãy uống một ngụm nước mát nhé!',
    };
    return readEncryptedJson<VoiceReminderSettings>(STORAGE_KEYS.VOICE, defaultVoice);
  });

  // 2. Daily Wellness Stats & 7-Day History (Hardware-Bound Encrypted Storage enc:v1:)
  const [weeklyHistory, setWeeklyHistory] = useState<DailyWellnessStats[]>(() => {
    return readEncryptedJson<DailyWellnessStats[]>(STORAGE_KEYS.WEEKLY_HISTORY, []);
  });

  const [dailyStats, setDailyStats] = useState<DailyWellnessStats>(() => {
    const today = getTodayString();
    const parsed = readEncryptedJson<DailyWellnessStats | null>(STORAGE_KEYS.DAILY_STATS, null);
    if (parsed && parsed.date === today) {
      return parsed;
    }
    return {
      date: today,
      waterIntakeMl: 0,
      waterLogs: [],
      standupCompletedCount: 0,
      eyeBreakCompletedCount: 0,
      focusMinutes: 0,
    };
  });

  // 3. Timers & Break Modal States
  const [standupSecondsLeft, setStandupSecondsLeft] = useState<number>(
    standupSettings.standupIntervalMinutes * 60
  );
  const [eyeSecondsLeft, setEyeSecondsLeft] = useState<number>(
    standupSettings.eyeBreakIntervalMinutes * 60
  );
  const [waterSecondsLeft, setWaterSecondsLeft] = useState<number>(
    hydrationSettings.intervalMinutes * 60
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [isBreakModalOpen, setIsBreakModalOpen] = useState<boolean>(false);
  const [currentBreakType, setCurrentBreakType] = useState<BreakType>('standup');
  const [breakRemainingSec, setBreakRemainingSec] = useState<number>(180);
  const [breakTotalSec, setBreakTotalSec] = useState<number>(180);

  // Water Toast Notification Banner, Passive 20-20-20 Eye Cue & Gentle Break Banner
  const [waterToastVisible, setWaterToastVisible] = useState<boolean>(false);
  const [gentleBreakBanner, setGentleBreakBanner] = useState<BreakType | null>(null);
  const [passiveEyeCueSec, setPassiveEyeCueSec] = useState<number>(0);
  const [isDeferredByFullscreen, setIsDeferredByFullscreen] = useState<boolean>(false);
  const [undoWaterToast, setUndoWaterToast] = useState<{
    logId: string;
    amountMl: number;
    secondsLeft: number;
  } | null>(null);

  const wasIdleResetRef = useRef<boolean>(false);
  const lastPeerActiveAtRef = useRef<number>(0);
  const lastLanPulseSeenAtRef = useRef<number>(0);
  const lastCloudHeartbeatSentAtRef = useRef<number>(0);
  const lastWallClockMsRef = useRef<number>(Date.now());

  // System Context & Audio Ducking Status
  const [systemIdleSec, setSystemIdleSec] = useState<number>(0);
  const [isFullscreenApp, setIsFullscreenApp] = useState<boolean>(false);
  const [duckedAppsCount, setDuckedAppsCount] = useState<number>(0);
  const [isDuckedActive, setIsDuckedActive] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // Autostart Status
  const [autostartEnabled, setAutostartEnabled] = useState<boolean>(false);
  const [startMinimized, setStartMinimized] = useState<boolean>(true);

  // Silent OTA Auto-Updater States (Chrome / VS Code style)
  const [availableUpdateVersion, setAvailableUpdateVersion] = useState<string | null>(null);
  const [isUpdatingApp, setIsUpdatingApp] = useState<boolean>(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);
  const isStagingUpdateRef = useRef<boolean>(false);

  const checkAppUpdate = useCallback(
    async (manual = false) => {
      if (isStagingUpdateRef.current) return;
      if (manual) {
        setUpdateStatusMsg(lang === 'en' ? 'Checking...' : 'Đang kiểm tra...');
      }
      const remoteVer = await fetchLatestGithubVersion();
      if (remoteVer && compareSemver(remoteVer, CURRENT_APP_VERSION) > 0) {
        isStagingUpdateRef.current = true;
        setUpdateStatusMsg(null);
        // Step 1: Silently download & pre-stage update in the background without any popup/notification
        const stageResult = await stageSilentUpdate(remoteVer);
        isStagingUpdateRef.current = false;
        if (stageResult !== null) {
          // Step 2: Only light up the Subtle Visual Nudge once the update is 100% staged on disk
          setAvailableUpdateVersion(remoteVer);
        }
      } else if (manual) {
        setUpdateStatusMsg(
          lang === 'en' ? '✓ Up to date' : `✓ Mới nhất (v${CURRENT_APP_VERSION})`
        );
        window.setTimeout(() => setUpdateStatusMsg(null), 3500);
      }
    },
    [lang]
  );

  const handleInstallUpdate = useCallback(async () => {
    if (!availableUpdateVersion || isUpdatingApp) return;
    setIsUpdatingApp(true);
    try {
      await downloadAndInstallUpdate(availableUpdateVersion);
    } catch (err: unknown) {
      setIsUpdatingApp(false);
      setUpdateStatusMsg(
        err instanceof Error ? err.message : String(err)
      );
      window.setTimeout(() => setUpdateStatusMsg(null), 5000);
    }
  }, [availableUpdateVersion, isUpdatingApp]);

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      void checkAppUpdate(false);
    }, 4000);
    const pollTimer = window.setInterval(() => {
      void checkAppUpdate(false);
    }, 6 * 60 * 60 * 1000);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(pollTimer);
    };
  }, [checkAppUpdate]);

  // Firebase Multi-Device Cloud Sync States
  const [syncStatus, setSyncStatus] = useState<SyncConnectionStatus>('disconnected');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeSyncCode, setActiveSyncCode] = useState<string>(() =>
    firebaseSyncService.getSavedSyncCode()
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastSyncedDevice, setLastSyncedDevice] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDeviceMetadata[]>([]);
  const [isFirebaseConfigured] = useState<boolean>(() =>
    firebaseSyncService.isConfigured()
  );
  const isApplyingRemoteRef = useRef<boolean>(false);

  const syncTimerTargets = useCallback(
    (
      nextStandupSec?: number,
      nextEyeSec?: number,
      nextWaterSec?: number
    ) => {
      const now = Date.now();
      const myHwId = getCachedHardwareId();
      setStandupSettings((prev) => {
        const nextStandupAt =
          nextStandupSec !== undefined
            ? now + nextStandupSec * 1000
            : prev.nextStandupAt;
        const nextEyeAt =
          nextEyeSec !== undefined ? now + nextEyeSec * 1000 : prev.nextEyeAt;
        const nextWaterAt =
          nextWaterSec !== undefined
            ? now + nextWaterSec * 1000
            : prev.nextWaterAt;

        const roomKey = (userEmail || activeSyncCode || '').trim().toLowerCase();
        if (roomKey && myHwId) {
          broadcastLanPulse(
            roomKey,
            myHwId,
            getDefaultDeviceName(),
            nextStandupAt,
            nextEyeAt,
            nextWaterAt
          );
        }

        return {
          ...prev,
          nextStandupAt,
          nextEyeAt,
          nextWaterAt,
          timerSyncUpdatedAt: now,
          lastActiveAt: now,
          lastActiveDeviceId: myHwId || prev.lastActiveDeviceId,
        };
      });
    },
    [activeSyncCode, userEmail]
  );

  // 4. Sound Mixer States
  const [activeSounds, setActiveSounds] = useState<Record<SoundId, boolean>>({
    rain: false,
    stream: false,
    ocean: false,
    wind: false,
    campfire: false,
    singing_bowl: false,
    alpha_waves: false,
    theta_waves: false,
    brown_noise: false,
    pink_noise: false,
  });

  const [soundVolumes, setSoundVolumes] = useState<Record<SoundId, number>>(() => {
    const initial: Record<string, number> = {};
    AMBIENT_SOUNDS.forEach((s) => {
      initial[s.id] = s.defaultVolume;
    });
    return initial as Record<SoundId, number>;
  });

  const [masterVolume, setMasterVolume] = useState<number>(0.75);
  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(false);
  const [activeStationUrl, setActiveStationUrl] = useState<string | null>(null);
  const [activeStationName, setActiveStationName] = useState<string | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState<boolean>(false);
  const [radioVolume, setRadioVolume] = useState<number>(0.65);
  const [radioError, setRadioError] = useState<string | null>(null);

  // Save settings & health history to Hardware-Bound Encrypted Storage (enc:v1:)
  useEffect(() => {
    writeEncryptedJson(STORAGE_KEYS.STANDUP, standupSettings);
  }, [standupSettings]);

  useEffect(() => {
    writeEncryptedJson(STORAGE_KEYS.HYDRATION, hydrationSettings);
  }, [hydrationSettings]);

  useEffect(() => {
    writeEncryptedJson(STORAGE_KEYS.VOICE, voiceSettings);
  }, [voiceSettings]);

  useEffect(() => {
    writeEncryptedJson(STORAGE_KEYS.DAILY_STATS, dailyStats);
    setWeeklyHistory((prev) => {
      const filtered = prev.filter((item) => item.date !== dailyStats.date);
      const updated = [...filtered, dailyStats].slice(-14);
      writeEncryptedJson(STORAGE_KEYS.WEEKLY_HISTORY, updated);
      return updated;
    });
  }, [dailyStats]);

  // Initialize Autostart Status, Tray Language, Radio Callback & Firebase Cloud Sync
  const handleRemoteCloudSnapshot = useCallback((docData: CloudWellnessDocument) => {
    isApplyingRemoteRef.current = true;
    setLastSyncedDevice(docData.lastDeviceName || null);
    setLastSyncedAt(docData.updatedAt || Date.now());
    if (Array.isArray(docData.connectedDevices)) {
      setConnectedDevices(docData.connectedDevices);
    }

    if (docData.dailyStats) {
      setDailyStats((prev) => mergeDailyStats(prev, docData.dailyStats));
    }
    if (docData.weeklyHistory) {
      setWeeklyHistory((prev) => {
        const merged = mergeWeeklyHistory(prev, docData.weeklyHistory);
        writeEncryptedJson(STORAGE_KEYS.WEEKLY_HISTORY, merged);
        return merged;
      });
    }

    // Synchronize countdown timers across linked devices (prevents double reminders!)
    if (docData.standupSettings) {
      const now = Date.now();
      const remoteStandup = docData.standupSettings;
      const myHwId = getCachedHardwareId();

      // "Last Active Wins": Record peer activity timestamp from Cloud Fallback
      if (
        remoteStandup.lastActiveAt &&
        remoteStandup.lastActiveDeviceId &&
        remoteStandup.lastActiveDeviceId !== myHwId
      ) {
        lastPeerActiveAtRef.current = Math.max(
          lastPeerActiveAtRef.current,
          remoteStandup.lastActiveAt
        );
      }

      if (remoteStandup.nextStandupAt && remoteStandup.nextStandupAt > now) {
        const remSec = Math.round((remoteStandup.nextStandupAt - now) / 1000);
        const maxSec = (remoteStandup.standupIntervalMinutes || 60) * 60;
        const clampedSec = Math.min(maxSec, Math.max(5, remSec));
        setStandupSecondsLeft(clampedSec);
        // If another machine just completed/reset the break, auto-dismiss open popup on this machine!
        if (clampedSec > 90) {
          setIsBreakModalOpen(false);
          setGentleBreakBanner(null);
        }
      }
      if (remoteStandup.nextEyeAt && remoteStandup.nextEyeAt > now) {
        const remEye = Math.round((remoteStandup.nextEyeAt - now) / 1000);
        const maxEye = (remoteStandup.eyeBreakIntervalMinutes || 20) * 60;
        setEyeSecondsLeft(Math.min(maxEye, Math.max(5, remEye)));
      }
      if (remoteStandup.nextWaterAt && remoteStandup.nextWaterAt > now) {
        const remWater = Math.round((remoteStandup.nextWaterAt - now) / 1000);
        setWaterSecondsLeft(Math.max(5, remWater));
        if (remWater > 90) {
          setWaterToastVisible(false);
        }
      }
      if (remoteStandup.nextStandupAt && remoteStandup.nextStandupAt > now) {
        setStandupSettings((prev) => ({
          ...prev,
          nextStandupAt: remoteStandup.nextStandupAt ?? prev.nextStandupAt,
          nextEyeAt: remoteStandup.nextEyeAt ?? prev.nextEyeAt,
          nextWaterAt: remoteStandup.nextWaterAt ?? prev.nextWaterAt,
          timerSyncUpdatedAt:
            remoteStandup.timerSyncUpdatedAt ?? prev.timerSyncUpdatedAt,
        }));
      } else {
        // First machine on v1.2 seeds the shared countdown target in the cloud
        setStandupSettings((prev) => ({
          ...prev,
          nextStandupAt: now + prev.standupIntervalMinutes * 60 * 1000,
          nextEyeAt: now + prev.eyeBreakIntervalMinutes * 60 * 1000,
          nextWaterAt: now + prev.standupIntervalMinutes * 60 * 1000,
          timerSyncUpdatedAt: now,
        }));
      }
    }

    setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 350);
  }, []);

  useEffect(() => {
    getAutostartStatus().then((status) => setAutostartEnabled(status));
    setTrayLanguage(lang);
    soundEngine.setRadioCallback((playing, error) => {
      setIsRadioPlaying(playing);
      if (error) setRadioError(error);
    });

    if (firebaseSyncService.isConfigured()) {
      const unsubAuth = firebaseSyncService.onUserChange((user) => {
        const email = user?.email ? user.email.trim().toLowerCase() : null;
        setUserEmail(email);
        setActiveSyncCode(email || '');
        if (email) {
          firebaseSyncService.startRealtimeSync(
            email,
            {
              dailyStats,
              weeklyHistory,
              standupSettings,
              hydrationSettings,
              voiceSettings,
            },
            handleRemoteCloudSnapshot,
            (status, err) => {
              setSyncStatus(status);
              setSyncError(err || null);
            }
          );
        } else {
          setSyncStatus('disconnected');
          setConnectedDevices([]);
        }
      });
      return () => {
        unsubAuth();
        firebaseSyncService.stopListening();
      };
    }
  }, []);

  // Automatically push local wellness changes to Firebase Cloud when connected
  useEffect(() => {
    if (isApplyingRemoteRef.current) return;
    if (!isFirebaseConfigured) return;
    if (!activeSyncCode && !userEmail) return;
    if (syncStatus === 'connecting') return;

    const timer = window.setTimeout(() => {
      firebaseSyncService
        .pushUpdate(activeSyncCode || null, {
          dailyStats,
          weeklyHistory,
          standupSettings,
          hydrationSettings,
          voiceSettings,
        })
        .catch((err) => {
          setSyncError(err instanceof Error ? err.message : String(err));
        });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    activeSyncCode,
    dailyStats,
    hydrationSettings,
    isFirebaseConfigured,
    standupSettings,
    syncStatus,
    userEmail,
    voiceSettings,
    weeklyHistory,
  ]);

  const handleConnectSyncCode = (code: string) => {
    if (!code) return;
    firebaseSyncService.saveSyncCode(code);
    setActiveSyncCode(code);
    setSyncError(null);
    firebaseSyncService.startRealtimeSync(
      code,
      {
        dailyStats,
        weeklyHistory,
        standupSettings,
        hydrationSettings,
        voiceSettings,
      },
      handleRemoteCloudSnapshot,
      (status, err) => {
        setSyncStatus(status);
        setSyncError(err || null);
      }
    );
  };

  const handleDisconnectSync = () => {
    firebaseSyncService.stopListening();
    firebaseSyncService.saveSyncCode('');
    setActiveSyncCode('');
    setSyncStatus('disconnected');
  };

  const handleGoogleSignIn = async () => {
    try {
      setSyncError(null);
      const user = await firebaseSyncService.signInWithGoogle();
      setUserEmail(user.email || 'Google User');
      await firebaseSyncService.startRealtimeSync(
        activeSyncCode || null,
        {
          dailyStats,
          weeklyHistory,
          standupSettings,
          hydrationSettings,
          voiceSettings,
        },
        handleRemoteCloudSnapshot,
        (status, err) => {
          setSyncStatus(status);
          setSyncError(err || null);
        }
      );
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleEmailAuth = async (
    email: string,
    pass: string,
    isRegister: boolean
  ) => {
    try {
      setSyncError(null);
      const user = await firebaseSyncService.signInWithEmail(
        email,
        pass,
        isRegister
      );
      setUserEmail(user.email || email);
      await firebaseSyncService.startRealtimeSync(
        activeSyncCode || null,
        {
          dailyStats,
          weeklyHistory,
          standupSettings,
          hydrationSettings,
          voiceSettings,
        },
        handleRemoteCloudSnapshot,
        (status, err) => {
          setSyncStatus(status);
          setSyncError(err || null);
        }
      );
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLogoutAccount = async () => {
    await firebaseSyncService.logout();
    setUserEmail(null);
    setActiveSyncCode('');
    setConnectedDevices([]);
    setSyncStatus('disconnected');
  };

  const handleForceSyncNow = async () => {
    try {
      setSyncError(null);
      await firebaseSyncService.pushUpdate(activeSyncCode || null, {
        dailyStats,
        weeklyHistory,
        standupSettings,
        hydrationSettings,
        voiceSettings,
      });
      setLastSyncedAt(Date.now());
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSwitchLanguage = (nextLang: AppLanguage) => {
    setLang(nextLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, nextLang);
    setTrayLanguage(nextLang);
    // Also auto-switch default voice pack if user hasn't customized it
    if (nextLang === 'en' && voiceSettings.voicePack !== 'custom_tts') {
      setVoiceSettings((prev) => ({ ...prev, voicePack: 'english_neural' }));
    } else if (nextLang === 'vi' && voiceSettings.voicePack === 'english_neural') {
      setVoiceSettings((prev) => ({ ...prev, voicePack: 'female_neural' }));
    }
  };

  // Helper to trigger Vietnamese Voice with WASAPI Audio Ducking
  const triggerVoiceReminder = useCallback(
    async (kind: BreakType | 'water' | 'break_done' | 'test') => {
      await soundEngine.playVietnameseVoiceReminder(
        kind,
        voiceSettings,
        (count, active) => {
          if (active) {
            setDuckedAppsCount(count);
          }
          setIsDuckedActive(active);
        }
      );
    },
    [voiceSettings]
  );

  // Start a Break Session (Standup, Eye, or Combo)
  const startBreakSession = useCallback(
    async (type: BreakType, forceOverlay: boolean = false) => {
      const duration =
        type === 'eye'
          ? standupSettings.eyeBreakDurationSeconds
          : standupSettings.standupDurationSeconds;

      setCurrentBreakType(type);
      setBreakTotalSec(duration);
      setBreakRemainingSec(duration);

      if (!forceOverlay && standupSettings.reminderMode === 'gentle') {
        setGentleBreakBanner(type);
        const notifTitle =
          type === 'eye'
            ? lang === 'en'
              ? '👀 20-20-20 Eye Care Time!'
              : '👀 Đến giờ nghỉ mắt 20-20-20!'
            : lang === 'en'
            ? '🧘 Time to Stand Up & Stretch!'
            : '🧘 Đến giờ đứng dậy giãn cơ rồi!';
        const notifBody =
          type === 'eye'
            ? lang === 'en'
              ? 'Look 20 feet away for 20 seconds to relax your eyes.'
              : 'Hãy nhìn xa 6 mét trong 20 giây để thư giãn mắt nhé.'
            : lang === 'en'
            ? 'Click the DeskAura taskbar/tray icon whenever you are ready to stretch.'
            : 'Nhấn vào biểu tượng DeskAura dưới Taskbar/Tray khi bạn sẵn sàng tập giãn cơ nhé.';
        await sendTrayNotification(notifTitle, notifBody);
        await triggerVoiceReminder(type);
        return;
      }

      setGentleBreakBanner(null);
      setIsBreakModalOpen(true);

      await showAndFocusWindow(true);
      await triggerVoiceReminder(type);
    },
    [
      lang,
      standupSettings.eyeBreakDurationSeconds,
      standupSettings.reminderMode,
      standupSettings.standupDurationSeconds,
      triggerVoiceReminder,
    ]
  );

  // Complete Break Session
  const completeBreakSession = useCallback(async () => {
    setIsBreakModalOpen(false);
    setGentleBreakBanner(null);
    await setWindowAlwaysOnTop(false);

    const nextEyeSec = standupSettings.eyeBreakIntervalMinutes * 60;
    if (currentBreakType === 'eye') {
      setEyeSecondsLeft(nextEyeSec);
      syncTimerTargets(standupSecondsLeft, nextEyeSec, waterSecondsLeft);
      setDailyStats((prev) => ({
        ...prev,
        eyeBreakCompletedCount: prev.eyeBreakCompletedCount + 1,
      }));
    } else {
      const nextStandupSec = standupSettings.standupIntervalMinutes * 60;
      const nextWaterSec = hydrationSettings.intervalMinutes * 60;
      setStandupSecondsLeft(nextStandupSec);
      setEyeSecondsLeft(nextEyeSec);
      setWaterSecondsLeft(nextWaterSec);
      syncTimerTargets(nextStandupSec, nextEyeSec, nextWaterSec);
      setDailyStats((prev) => ({
        ...prev,
        standupCompletedCount: prev.standupCompletedCount + 1,
      }));
    }

    await triggerVoiceReminder('break_done');
  }, [
    currentBreakType,
    hydrationSettings.intervalMinutes,
    standupSecondsLeft,
    standupSettings.eyeBreakIntervalMinutes,
    standupSettings.standupIntervalMinutes,
    syncTimerTargets,
    triggerVoiceReminder,
    waterSecondsLeft,
  ]);

  // Snooze Break Session
  const snoozeBreakSession = useCallback(
    async (minutes: number) => {
      setIsBreakModalOpen(false);
      setGentleBreakBanner(null);
      await setWindowAlwaysOnTop(false);
      const nextSec = minutes * 60;
      setStandupSecondsLeft(nextSec);
      syncTimerTargets(nextSec, eyeSecondsLeft, waterSecondsLeft);
    },
    [eyeSecondsLeft, syncTimerTargets, waterSecondsLeft]
  );

  // Skip Break Session
  const skipBreakSession = useCallback(async () => {
    setIsBreakModalOpen(false);
    setGentleBreakBanner(null);
    await setWindowAlwaysOnTop(false);
    if (currentBreakType === 'eye') {
      const nextEye = standupSettings.eyeBreakIntervalMinutes * 60;
      setEyeSecondsLeft(nextEye);
      syncTimerTargets(standupSecondsLeft, nextEye, waterSecondsLeft);
    } else {
      const nextStand = standupSettings.standupIntervalMinutes * 60;
      setStandupSecondsLeft(nextStand);
      syncTimerTargets(nextStand, eyeSecondsLeft, waterSecondsLeft);
    }
  }, [
    currentBreakType,
    eyeSecondsLeft,
    standupSecondsLeft,
    standupSettings.eyeBreakIntervalMinutes,
    standupSettings.standupIntervalMinutes,
    syncTimerTargets,
    waterSecondsLeft,
  ]);

  // Add Water Intake (with 5-second 1-click Undo protection)
  const handleAddWater = useCallback(
    (amountMl: number) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const logId = `${Date.now()}-${Math.random()}`;

      setDailyStats((prev) => {
        const nextTotal = prev.waterIntakeMl + amountMl;
        const crossedGoal =
          prev.waterIntakeMl < hydrationSettings.dailyGoalMl &&
          nextTotal >= hydrationSettings.dailyGoalMl;

        if (crossedGoal) {
          try {
            confetti({
              particleCount: 70,
              spread: 65,
              origin: { y: 0.65 },
            });
          } catch {
            // ignore
          }
        }

        return {
          ...prev,
          waterIntakeMl: nextTotal,
          waterLogs: [
            {
              id: logId,
              timestamp: timeStr,
              amountMl,
            },
            ...prev.waterLogs.slice(0, 14),
          ],
        };
      });

      setUndoWaterToast({ logId, amountMl, secondsLeft: 5 });

      // Reset water reminder timer on drink & synchronize across linked devices
      const nextWaterSec = hydrationSettings.intervalMinutes * 60;
      setWaterSecondsLeft(nextWaterSec);
      setWaterToastVisible(false);
      syncTimerTargets(standupSecondsLeft, eyeSecondsLeft, nextWaterSec);
    },
    [
      eyeSecondsLeft,
      hydrationSettings.dailyGoalMl,
      hydrationSettings.intervalMinutes,
      standupSecondsLeft,
      syncTimerTargets,
    ]
  );

  // Undo accidental 1-click water log within 5 seconds
  const handleUndoWater = useCallback(() => {
    if (!undoWaterToast) return;
    const { logId, amountMl } = undoWaterToast;
    setDailyStats((prev) => ({
      ...prev,
      waterIntakeMl: Math.max(0, prev.waterIntakeMl - amountMl),
      waterLogs: prev.waterLogs.filter((l) => l.id !== logId),
    }));
    setUndoWaterToast(null);
  }, [undoWaterToast]);

  // Listen to System Tray Menu & Local LAN UDP Events from Rust Backend
  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    onTauriEvent<number>('tray-add-water', (amount) => {
      handleAddWater(amount || 200);
    }).then((unlisten) => unlisteners.push(unlisten));

    onTauriEvent<string>('tray-trigger-break', () => {
      startBreakSession('combo', true);
    }).then((unlisten) => unlisteners.push(unlisten));

    onTauriEvent<LanPulsePacket>('deskaura://lan-pulse', (packet) => {
      const myRoomHash = hashLanRoomKey(userEmail || activeSyncCode || '');
      const myHwId = getCachedHardwareId();
      if (!myRoomHash || packet.room_key !== myRoomHash || packet.device_id === myHwId) {
        return;
      }
      const now = Date.now();
      lastLanPulseSeenAtRef.current = now;
      lastPeerActiveAtRef.current = Math.max(
        lastPeerActiveAtRef.current,
        packet.active_at || now
      );

      if (packet.next_standup_at && packet.next_standup_at > now) {
        const remSec = Math.round((packet.next_standup_at - now) / 1000);
        const maxSec = (standupSettings.standupIntervalMinutes || 60) * 60;
        const clampedSec = Math.min(maxSec, Math.max(5, remSec));
        setStandupSecondsLeft(clampedSec);
        if (clampedSec > 90) {
          setIsBreakModalOpen(false);
          setGentleBreakBanner(null);
        }
      }
      if (packet.next_eye_at && packet.next_eye_at > now) {
        const remEye = Math.round((packet.next_eye_at - now) / 1000);
        const maxEye = (standupSettings.eyeBreakIntervalMinutes || 20) * 60;
        setEyeSecondsLeft(Math.min(maxEye, Math.max(5, remEye)));
      }
      if (packet.next_water_at && packet.next_water_at > now) {
        const remWater = Math.round((packet.next_water_at - now) / 1000);
        setWaterSecondsLeft(Math.max(5, remWater));
        if (remWater > 90) {
          setWaterToastVisible(false);
        }
      }
    }).then((unlisten) => unlisteners.push(unlisten));

    onTauriEvent<boolean>('tray-toggle-music', (hasZingWindow) => {
      if (soundEngine.isAnySoundPlaying()) {
        const muted = soundEngine.toggleMasterMute();
        setIsMasterMuted(muted);
      } else if (!hasZingWindow) {
        const defaultMix = SOUND_PRESETS[0].mix;
        soundEngine.applyPreset(defaultMix);
        setActiveSounds((prev) => ({
          ...prev,
          rain: true,
          brown_noise: true,
          alpha_waves: true,
        }));
      }
    }).then((unlisten) => unlisteners.push(unlisten));

    onTauriEvent<void>('tray-stop-all-music', () => {
      soundEngine.stopAllSounds();
      setActiveSounds({
        rain: false,
        stream: false,
        ocean: false,
        wind: false,
        campfire: false,
        singing_bowl: false,
        alpha_waves: false,
        theta_waves: false,
        brown_noise: false,
        pink_noise: false,
      });
      setIsRadioPlaying(false);
      setActiveStationUrl(null);
      setActiveStationName(null);
    }).then((unlisten) => unlisteners.push(unlisten));

    onTauriEvent<void>('tray-open-zing', () => {
      openWebMusicPlayer(
        'https://zingmp3.vn/moi-phat-hanh',
        '🎶 DeskAura — Zing MP3 Mới Phát Hành'
      );
    }).then((unlisten) => unlisteners.push(unlisten));

    onTauriEvent<void>('tray-toggle-eye-shield', () => {
      setStandupSettings((prev) => {
        const nextEnabled = !prev.eyeShieldEnabled;
        void sendTrayNotification(
          nextEnabled
            ? lang === 'en'
              ? '🛡️ Eye-Shield Enabled'
              : '🛡️ Đã bật Bảo vệ mắt (Eye-Shield)'
            : lang === 'en'
            ? '🎨 Color-Accurate Mode (100%)'
            : '🎨 Đã tắt lọc sáng (Chuẩn màu 100%)',
          nextEnabled
            ? lang === 'en'
              ? 'Screen brightness and blue-light filter adjusted for eye comfort.'
              : 'Màn hình đã được dịu sáng và lọc ánh sáng xanh bảo vệ mắt.'
            : lang === 'en'
            ? 'Restored original 100% display color accuracy.'
            : 'Đã trả màn hình về độ sáng và màu sắc chuẩn 100%.'
        );
        return {
          ...prev,
          eyeShieldEnabled: nextEnabled,
          eyeShieldMode: prev.eyeShieldMode || 'auto',
        };
      });
    }).then((unlisten) => unlisteners.push(unlisten));

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [
    activeSyncCode,
    handleAddWater,
    standupSettings.eyeBreakIntervalMinutes,
    standupSettings.standupIntervalMinutes,
    startBreakSession,
    userEmail,
  ]);

  // Pillar 3: Dynamic System Tray Pie/Ring Progress Indicator (with Ruby Red Fullscreen Deferral & Witty Quotes)
  const [quoteSeed, setQuoteSeed] = useState<number>(0);
  const handlePokePlant = useCallback(() => setQuoteSeed((s) => s + 1), []);
  const lastTrayStateKeyRef = useRef<string>('');

  useEffect(() => {
    const totalSec = Math.max(60, standupSettings.standupIntervalMinutes * 60);
    const ratio = Math.min(
      1,
      Math.max(0, (totalSec - standupSecondsLeft) / totalSec)
    );
    const isEyeCue = passiveEyeCueSec > 0;
    const minsLeft = Math.ceil(standupSecondsLeft / 60);

    // Update tray icon immediately on passive eye cue / fullscreen deferral, or every 5s of normal countdown
    if (isDeferredByFullscreen || isEyeCue || standupSecondsLeft % 5 === 0) {
      const quantizedRatio = Math.round(ratio * 100);
      const wPct = Math.min(
        100,
        Math.round((dailyStats.waterIntakeMl / hydrationSettings.dailyGoalMl) * 100)
      );
      const trayKey = `${quantizedRatio}_${minsLeft}_${wPct}_${isEyeCue ? passiveEyeCueSec : 0}_${isDeferredByFullscreen ? 1 : 0}_${lang}_${quoteSeed}`;
      if (lastTrayStateKeyRef.current === trayKey) {
        return;
      }
      lastTrayStateKeyRef.current = trayKey;

      const quotesDict = PLANT_WITTY_QUOTES[lang] || PLANT_WITTY_QUOTES.vi;
      const eyeQuotes = quotesDict.eyeCue;
      const eyeQuote = eyeQuotes[quoteSeed % eyeQuotes.length];

      const hour = new Date().getHours();
      const isNight = hour >= 23 || hour <= 4;
      const gPct = Math.min(
        100,
        Math.round(wPct * 0.75 + Math.min(25, dailyStats.standupCompletedCount * 6.25))
      );
      const sittingMins = (totalSec - standupSecondsLeft) / 60;
      const expectedWater = hour < 10 ? 0 : hour < 14 ? 25 : hour < 17 ? 50 : 65;
      const isThirsty =
        wPct < 100 &&
        (sittingMins >= 45 || (hour >= 10 && wPct < expectedWater));

      const pool = isNight
        ? quotesDict.nightOwl
        : gPct >= 85
        ? quotesDict.blooming
        : isThirsty
        ? quotesDict.thirsty
        : quotesDict.growing;
      const statusQuote = pool[(quoteSeed + Math.floor(minsLeft / 10)) % pool.length];

      const tooltip = isDeferredByFullscreen
        ? lang === 'en'
          ? '🔴 DeskAura — Break deferred while in Full-Screen / Presentation mode'
          : '🔴 DeskAura — Đang hoãn nhắc nghỉ vì bạn đang Toàn màn hình / Thuyết trình'
        : isEyeCue
        ? `👀 (${passiveEyeCueSec}s) ${eyeQuote}`
        : lang === 'en'
        ? `🌱 DeskAura (${minsLeft}m left) — ${statusQuote}`
        : `🌱 DeskAura (Còn ${minsLeft}p) — ${statusQuote}`;
      updateTrayProgressIcon(ratio, isEyeCue, tooltip, isDeferredByFullscreen);
    }
  }, [
    dailyStats.standupCompletedCount,
    dailyStats.waterIntakeMl,
    hydrationSettings.dailyGoalMl,
    isDeferredByFullscreen,
    lang,
    passiveEyeCueSec,
    quoteSeed,
    standupSecondsLeft,
    standupSettings.standupIntervalMinutes,
  ]);

  // Pillar 4: Hardware Eye-Shield & 20-Second Breathing Dimmer (1.5s Smooth Fade In-Out)
  const isEyeBreakDimmingActive =
    (standupSettings.eyeBreakDimScreen ?? true) &&
    (passiveEyeCueSec > 0 || (isBreakModalOpen && currentBreakType === 'eye'));
  // currentHourBucket is computed at render time. Because the component re-renders every
  // second (standupSecondsLeft tick), this value naturally updates at the hour boundary
  // (e.g. 17:00, 21:00) and triggers the Eye-Shield useEffect correctly via its dep array.
  const currentHourBucket = new Date().getHours();

  useEffect(() => {
    // 1. Color-Accurate Bypass when Fullscreen Guard is active
    if (standupSettings.pauseOnFullscreen && isFullscreenApp) {
      void setScreenEyeFilter(1.0, 0.0, 1200);
      return;
    }

    // 2. Base Eye-Shield profile (Off / Auto by Hour / Office / Night OT)
    let baseBrightness = 1.0;
    let baseWarmth = 0.0;

    if (standupSettings.eyeShieldEnabled) {
      const mode = standupSettings.eyeShieldMode || 'auto';
      if (mode === 'office') {
        baseBrightness = 0.92;
        baseWarmth = 0.16;
      } else if (mode === 'night') {
        baseBrightness = 0.68;
        baseWarmth = 0.45;
      } else {
        // Circadian Auto Mode — applies the correct warmth/brightness for morning, afternoon, and night OT.
        // currentHourBucket comes from the outer render scope; it is refreshed every second
        // through component re-renders, so the circadian transition fires precisely at the boundary.
        if (currentHourBucket >= 21 || currentHourBucket < 6) {
          baseBrightness = 0.68;
          baseWarmth = 0.45;
        } else if (currentHourBucket >= 17) {
          baseBrightness = 0.84;
          baseWarmth = 0.28;
        } else {
          baseBrightness = 0.93;
          baseWarmth = 0.12;
        }
      }
    }

    // 3. Apply 20-20-20 Breathing Dimmer (Fade-out 1.5s on start, Fade-in 1.5s on end)
    const targetBrightness = isEyeBreakDimmingActive
      ? Math.max(0.45, baseBrightness * 0.65)
      : baseBrightness;
    const targetWarmth = isEyeBreakDimmingActive
      ? Math.min(0.60, baseWarmth + 0.18)
      : baseWarmth;

    void setScreenEyeFilter(targetBrightness, targetWarmth, 1500);
  }, [
    currentHourBucket,
    isEyeBreakDimmingActive,
    isFullscreenApp,
    standupSettings.eyeShieldEnabled,
    standupSettings.eyeShieldMode,
    standupSettings.pauseOnFullscreen,
  ]);

  // Main 1-Second Heartbeat Tick
  const tickCounterRef = useRef<number>(0);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      tickCounterRef.current += 1;
      const now = Date.now();
      const wallJumpSec = Math.floor((now - lastWallClockMsRef.current) / 1000);
      lastWallClockMsRef.current = now;

      // Count down 5-second Undo Water Toast
      setUndoWaterToast((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) return null;
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });

      // Count down Passive 20-20-20 Eye Cue (20s golden tray indicator, zero interruption)
      setPassiveEyeCueSec((prev) => {
        if (prev > 1) return prev - 1;
        if (prev === 1) {
          setDailyStats((d) => ({
            ...d,
            eyeBreakCompletedCount: d.eyeBreakCompletedCount + 1,
          }));
          return 0;
        }
        return 0;
      });

      const peerIdleSec =
        lastPeerActiveAtRef.current > 0
          ? Math.max(0, Math.floor((now - lastPeerActiveAtRef.current) / 1000))
          : Number.POSITIVE_INFINITY;

      // OS Sleep / Hibernate ("Hội chứng Bóng đè") Guard:
      // If wall-clock jumped >= 8 seconds between 1s ticks, the OS just woke from Sleep/Hibernation!
      if (wallJumpSec >= 8) {
        if (
          wallJumpSec >= standupSettings.autoResetIdleSeconds &&
          peerIdleSec >= standupSettings.autoResetIdleSeconds
        ) {
          // Machine slept >= 3 minutes (and no other device was active) -> Natural Break Reset!
          const fullStand = standupSettings.standupIntervalMinutes * 60;
          const fullEye = standupSettings.eyeBreakIntervalMinutes * 60;
          const fullWater = hydrationSettings.intervalMinutes * 60;
          setIsBreakModalOpen(false);
          setGentleBreakBanner(null);
          setIsDeferredByFullscreen(false);
          setStandupSecondsLeft(fullStand);
          setEyeSecondsLeft(fullEye);
          setWaterSecondsLeft(fullWater);
          syncTimerTargets(fullStand, fullEye, fullWater);
          return;
        } else if (standupSettings.nextStandupAt && standupSettings.nextStandupAt > now) {
          // Short sleep (< 3 minutes): recompute remaining seconds from Absolute Target Time
          setStandupSecondsLeft(
            Math.max(5, Math.round((standupSettings.nextStandupAt - now) / 1000))
          );
          if (standupSettings.nextEyeAt && standupSettings.nextEyeAt > now) {
            setEyeSecondsLeft(
              Math.max(5, Math.round((standupSettings.nextEyeAt - now) / 1000))
            );
          }
          if (standupSettings.nextWaterAt && standupSettings.nextWaterAt > now) {
            setWaterSecondsLeft(
              Math.max(5, Math.round((standupSettings.nextWaterAt - now) / 1000))
            );
          }
        }
      }

      // Pillar 1: Poll OS Mouse/Keyboard Idle & Fullscreen every 3 seconds
      if (tickCounterRef.current % 3 === 0) {
        const ctx = await getSystemContext();
        setSystemIdleSec(ctx.idle_seconds);
        setIsFullscreenApp(ctx.is_fullscreen);

        // If a break was deferred by Fullscreen/Presentation and the user just exited Fullscreen, trigger it now!
        if (!ctx.is_fullscreen && isDeferredByFullscreen) {
          setIsDeferredByFullscreen(false);
          const fullStand = standupSettings.standupIntervalMinutes * 60;
          const fullEye = standupSettings.eyeBreakIntervalMinutes * 60;
          const fullWater = hydrationSettings.intervalMinutes * 60;
          setStandupSecondsLeft(fullStand);
          setEyeSecondsLeft(fullEye);
          setWaterSecondsLeft(fullWater);
          syncTimerTargets(fullStand, fullEye, fullWater);
          startBreakSession('combo');
          return;
        }

        // The Kill Switch: Only emit cross-device heartbeats when >= 2 devices are registered
        const myHwId = getCachedHardwareId();
        const isMultiDevice = connectedDevices.length >= 2;
        if (isMultiDevice && ctx.idle_seconds < 15) {
          const roomKeyHash = hashLanRoomKey(userEmail || activeSyncCode || '');
          // 1. Local LAN UDP Broadcast (0 Cloud cost, <1ms latency) every 6 seconds while active
          if (roomKeyHash && myHwId && tickCounterRef.current % 6 === 0) {
            broadcastLanPulse(
              roomKeyHash,
              myHwId,
              getDefaultDeviceName(),
              standupSettings.nextStandupAt,
              standupSettings.nextEyeAt,
              standupSettings.nextWaterAt
            );
          }

          // 2. Cloud Fallback Heartbeat (Throttled to 120s ONLY when no LAN peer seen & peer was active within 2 hours)
          const hasRecentLanPeer = now - lastLanPulseSeenAtRef.current < 90_000;
          const hasPeerOnlineWithin2h = connectedDevices.some(
            (d) => d.uid !== myHwId && now - (d.lastSeenAt || 0) < 2 * 3600 * 1000
          );
          if (
            !hasRecentLanPeer &&
            hasPeerOnlineWithin2h &&
            now - lastCloudHeartbeatSentAtRef.current >= 120_000
          ) {
            lastCloudHeartbeatSentAtRef.current = now;
            setStandupSettings((prev) => ({
              ...prev,
              lastActiveAt: now,
              lastActiveDeviceId: myHwId || prev.lastActiveDeviceId,
            }));
          }
        }

        // "Last Active Wins": Effective ecosystem idle is the minimum of local OS idle and peer idle!
        const effectiveIdleSec = isMultiDevice
          ? Math.min(ctx.idle_seconds, peerIdleSec)
          : ctx.idle_seconds;

        // Auto-reset entire 60-minute Combo cycle ONLY when ALL devices are idle >= threshold (default 3 mins / 180s)
        if (
          effectiveIdleSec >= standupSettings.autoResetIdleSeconds &&
          !isBreakModalOpen
        ) {
          const fullStand = standupSettings.standupIntervalMinutes * 60;
          const fullEye = standupSettings.eyeBreakIntervalMinutes * 60;
          const fullWater = hydrationSettings.intervalMinutes * 60;
          setStandupSecondsLeft(fullStand);
          setEyeSecondsLeft(fullEye);
          setWaterSecondsLeft(fullWater);
          setIsDeferredByFullscreen(false);
          if (!wasIdleResetRef.current) {
            wasIdleResetRef.current = true;
            // In Gentle Mode (or when a gentle break notification was active), >180s of no mouse/keyboard input
            // automatically credits +1 completed stand-up break and dismisses the break notification!
            if (
              gentleBreakBanner !== null ||
              standupSettings.reminderMode === 'gentle'
            ) {
              setGentleBreakBanner(null);
              setDailyStats((prev) => ({
                ...prev,
                standupCompletedCount: prev.standupCompletedCount + 1,
              }));
            }
            syncTimerTargets(fullStand, fullEye, fullWater);
          }
          return;
        } else if (ctx.idle_seconds < 10 && wasIdleResetRef.current) {
          // User just returned to their desk! Lock in fresh 60m target timestamp across devices
          wasIdleResetRef.current = false;
          const fullStand = standupSettings.standupIntervalMinutes * 60;
          const fullEye = standupSettings.eyeBreakIntervalMinutes * 60;
          const fullWater = hydrationSettings.intervalMinutes * 60;
          syncTimerTargets(fullStand, fullEye, fullWater);
        }
      }

      // Increment focus minutes every 60 seconds
      if (tickCounterRef.current % 60 === 0 && !isPaused && !isBreakModalOpen) {
        setDailyStats((prev) => ({
          ...prev,
          focusMinutes: prev.focusMinutes + 1,
        }));
      }

      // If Break Overlay Modal is currently open, count down break duration
      if (isBreakModalOpen) {
        setBreakRemainingSec((prev) => {
          if (prev <= 1) {
            completeBreakSession();
            return 0;
          }
          return prev - 1;
        });
        return;
      }

      if (isPaused) return;

      // Pillar 2 (Part A): 60-Minute Unified Combo Ritual (Stand up + Drink Water + Stretch)
      setStandupSecondsLeft((prev) => {
        if (prev <= 1) {
          if (standupSettings.pauseOnFullscreen && isFullscreenApp) {
            // Defer popup & turn System Tray icon Ruby Red until user exits Fullscreen/Presentation
            setIsDeferredByFullscreen(true);
            return 5;
          }
          setIsDeferredByFullscreen(false);
          const fullStand = standupSettings.standupIntervalMinutes * 60;
          const fullEye = standupSettings.eyeBreakIntervalMinutes * 60;
          const fullWater = hydrationSettings.intervalMinutes * 60;
          setWaterSecondsLeft(fullWater);
          setEyeSecondsLeft(fullEye);
          syncTimerTargets(fullStand, fullEye, fullWater);
          startBreakSession('combo');
          return fullStand;
        }
        return prev - 1;
      });

      // Pillar 2 (Part B): Every 20 Minutes -> Passive Eye Cue ONLY (Golden Tray Icon, NO Popup/Voice interruption!)
      if (standupSettings.eyeBreakEnabled) {
        setEyeSecondsLeft((prev) => {
          if (prev <= 1) {
            if (standupSettings.pauseOnFullscreen && isFullscreenApp) {
              return 60;
            }
            if (standupSecondsLeft > 90) {
              setPassiveEyeCueSec(standupSettings.eyeBreakDurationSeconds || 20);
            }
            return standupSettings.eyeBreakIntervalMinutes * 60;
          }
          return prev - 1;
        });
      }

      // 3. Hydration Reminder Countdown (Unified into Combo when intervals match)
      setWaterSecondsLeft((prev) => {
        if (prev <= 1) {
          // Only show separate water toast if user configured a shorter custom water interval far from the Combo break
          if (standupSecondsLeft > 300) {
            setWaterToastVisible(true);
            sendTrayNotification(t.waterToastTitle, t.waterToastDesc);
            triggerVoiceReminder('water');
          }
          return hydrationSettings.intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    completeBreakSession,
    gentleBreakBanner,
    hydrationSettings.intervalMinutes,
    isBreakModalOpen,
    isFullscreenApp,
    isPaused,
    standupSecondsLeft,
    standupSettings.autoResetIdleSeconds,
    standupSettings.eyeBreakDurationSeconds,
    standupSettings.eyeBreakEnabled,
    standupSettings.eyeBreakIntervalMinutes,
    standupSettings.pauseOnFullscreen,
    standupSettings.reminderMode,
    standupSettings.standupIntervalMinutes,
    startBreakSession,
    syncTimerTargets,
    t.waterToastDesc,
    t.waterToastTitle,
    triggerVoiceReminder,
  ]);

  // Sound Mixer Handlers
  const handleToggleSound = (id: SoundId) => {
    const vol = soundVolumes[id] ?? 0.5;
    const nowPlaying = soundEngine.toggleSound(id, vol);
    setActiveSounds((prev) => ({ ...prev, [id]: nowPlaying }));
  };

  const handleChangeSoundVolume = (id: SoundId, vol: number) => {
    setSoundVolumes((prev) => ({ ...prev, [id]: vol }));
    soundEngine.setSoundVolume(id, vol);
  };

  const handleApplyPreset = (mix: Partial<Record<SoundId, number>>) => {
    soundEngine.applyPreset(mix);
    const nextActive: Record<SoundId, boolean> = {
      rain: false,
      stream: false,
      ocean: false,
      wind: false,
      campfire: false,
      singing_bowl: false,
      alpha_waves: false,
      theta_waves: false,
      brown_noise: false,
      pink_noise: false,
    };
    const nextVols = { ...soundVolumes };
    (Object.keys(mix) as SoundId[]).forEach((id) => {
      const v = mix[id];
      if (typeof v === 'number' && v > 0) {
        nextActive[id] = true;
        nextVols[id] = v;
      }
    });
    setActiveSounds(nextActive);
    setSoundVolumes(nextVols);
  };

  const handleStopAllSounds = () => {
    soundEngine.stopAllSounds();
    closeWebMusicPlayer();
    setActiveSounds({
      rain: false,
      stream: false,
      ocean: false,
      wind: false,
      campfire: false,
      singing_bowl: false,
      alpha_waves: false,
      theta_waves: false,
      brown_noise: false,
      pink_noise: false,
    });
    setIsRadioPlaying(false);
    setActiveStationUrl(null);
    setActiveStationName(null);
  };

  const handlePlayRadioStream = (url: string, label?: string) => {
    setRadioError(null);
    setActiveStationUrl(url);
    setActiveStationName(label || 'Đài trực tuyến');
    soundEngine.playRadioStream(url, radioVolume);
  };

  const handleStopRadio = () => {
    soundEngine.stopRadio();
    setIsRadioPlaying(false);
    setActiveStationUrl(null);
    setActiveStationName(null);
  };

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Computed Progress Percentages
  const standupTotalSec = standupSettings.standupIntervalMinutes * 60;
  const standupProgressPct = Math.min(
    100,
    Math.max(0, ((standupTotalSec - standupSecondsLeft) / standupTotalSec) * 100)
  );

  const waterProgressPct = Math.min(
    100,
    Math.round((dailyStats.waterIntakeMl / hydrationSettings.dailyGoalMl) * 100)
  );

  // Desk Plant Growth combines Water Goal % (75%) and Standup Sessions (25%)
  const plantGrowthPct = Math.min(
    100,
    Math.round(waterProgressPct * 0.75 + Math.min(25, dailyStats.standupCompletedCount * 10))
  );
  const plantStage =
    plantGrowthPct >= 85 ? 4 : plantGrowthPct >= 55 ? 3 : plantGrowthPct >= 25 ? 2 : 1;

  // Determine Plant Mood & Witty Quote (Night Owl 23h-4h, Blooming, Thirsty when water < 100%, or Growing)
  const currentHour = new Date().getHours();
  const isNightOwlHour = currentHour >= 23 || currentHour <= 4;
  const sittingMinutesElapsed = (standupTotalSec - standupSecondsLeft) / 60;
  const expectedWaterPctByHour =
    currentHour < 10 ? 0 : currentHour < 14 ? 25 : currentHour < 17 ? 50 : 65;
  const isPlantThirsty =
    waterProgressPct < 100 &&
    (sittingMinutesElapsed >= 45 ||
      (currentHour >= 10 && waterProgressPct < expectedWaterPctByHour));

  const plantMood: PlantMood = isNightOwlHour
    ? 'sleepy'
    : plantGrowthPct >= 85
    ? 'blooming'
    : isPlantThirsty
    ? 'thirsty'
    : 'growing';

  const quotesByLang = PLANT_WITTY_QUOTES[lang] || PLANT_WITTY_QUOTES.vi;
  const activeQuotePool =
    passiveEyeCueSec > 0
      ? quotesByLang.eyeCue
      : plantMood === 'sleepy'
      ? quotesByLang.nightOwl
      : plantMood === 'blooming'
      ? quotesByLang.blooming
      : plantMood === 'thirsty'
      ? quotesByLang.thirsty
      : waterProgressPct >= 100
      ? quotesByLang.hydratedNeedStretch
      : quotesByLang.growing;
  const activePlantQuote =
    activeQuotePool[quoteSeed % activeQuotePool.length] || '';

  const anySoundActive =
    Object.values(activeSounds).some(Boolean) || isRadioPlaying;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-slate-50 to-sky-50/80 text-slate-800 flex flex-col">
      {/* Top Minimalist Daylight Navigation Bar (Zero Blur for 0% GPU overhead) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-5 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 whitespace-nowrap">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/app-icon.svg"
              alt="DeskAura Logo"
              className="w-9 h-9 rounded-2xl shadow-sm"
            />
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-slate-800">
                DeskAura
              </h1>
              <button
                onClick={() => void checkAppUpdate(true)}
                title={
                  lang === 'en'
                    ? 'Click to check for updates'
                    : 'Nhấn để kiểm tra bản cập nhật mới'
                }
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition cursor-pointer"
              >
                v{CURRENT_APP_VERSION}
              </button>
              {availableUpdateVersion && (
                <button
                  onClick={() => void handleInstallUpdate()}
                  disabled={isUpdatingApp}
                  title={
                    lang === 'en'
                      ? `Update v${availableUpdateVersion} is ready. Click to restart & apply.`
                      : `Bản cập nhật v${availableUpdateVersion} đã sẵn sàng. Nhấn để khởi động lại & áp dụng.`
                  }
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-60 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-200" />
                  {isUpdatingApp
                    ? lang === 'en'
                      ? 'Restarting...'
                      : 'Đang khởi động lại...'
                    : lang === 'en'
                    ? `Restart to update v${availableUpdateVersion}`
                    : `Khởi động lại (v${availableUpdateVersion})`}
                </button>
              )}
              {updateStatusMsg && !isUpdatingApp && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {updateStatusMsg}
                </span>
              )}
            </div>
          </div>

          {/* Center Navigation Pills */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              {t.navDashboard}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'analytics'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {t.navAnalytics}
            </button>
            <button
              onClick={() => setActiveTab('sounds')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'sounds'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              {t.navSounds}
              {anySoundActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              title={
                availableUpdateVersion
                  ? lang === 'en'
                    ? `Update v${availableUpdateVersion} is ready. Restart to apply.`
                    : `Bản cập nhật v${availableUpdateVersion} đã sẵn sàng. Khởi động lại để áp dụng.`
                  : undefined
              }
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'settings'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              {t.navSettings}
              {availableUpdateVersion && (
                <span
                  className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"
                  title={
                    lang === 'en'
                      ? `Update v${availableUpdateVersion} ready`
                      : `Bản cập nhật v${availableUpdateVersion} đã sẵn sàng`
                  }
                />
              )}
            </button>
          </nav>

          {/* Right Quick Status, Language Toggle & Tray Action */}
          <div className="flex items-center gap-1.5">
            {/* Single-Icon Language Toggle (Click to switch VI <-> EN) */}
            <button
              onClick={() => handleSwitchLanguage(lang === 'vi' ? 'en' : 'vi')}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-sm transition shadow-xs"
              title={
                lang === 'vi'
                  ? 'Đang dùng Tiếng Việt — Bấm để đổi sang Tiếng Anh (EN)'
                  : 'Current: English — Click to switch to Vietnamese (VI)'
              }
            >
              {lang === 'vi' ? '🇻🇳' : '🇬🇧'}
            </button>

            {/* Quick Voice Mute / Silent Mode Toggle Pill */}
            <button
              onClick={() =>
                setVoiceSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                voiceSettings.enabled
                  ? 'bg-emerald-50/70 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title={
                voiceSettings.enabled
                  ? lang === 'en'
                    ? 'Voice prompt enabled — Click to switch to Silent Popup mode'
                    : 'Đang bật giọng đọc nhắc nhở — Bấm để tắt giọng (Chỉ hiện Popup)'
                  : lang === 'en'
                  ? 'Silent Popup mode active — Click to turn voice prompt back on'
                  : 'Đang tắt giọng đọc (Chỉ hiện Popup) — Bấm để bật lại giọng đọc'
              }
            >
              {voiceSettings.enabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  {lang === 'en' ? 'Voice On' : 'Giọng đọc'}
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  {lang === 'en' ? 'Silent' : 'Tắt giọng'}
                </>
              )}
            </button>

            {isDuckedActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                {t.duckingBadge}
              </span>
            )}

            <button
              onClick={() => setIsPaused((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                isPaused
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5" /> {t.resumeTimer}
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> {t.pauseTimer}
                </>
              )}
            </button>

            <button
              onClick={() => hideWindowToTray()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 transition"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              {t.hideToTray}
            </button>
          </div>
        </div>
      </header>

      {/* Gentle Break Toast Banner (when reminderMode === 'gentle') */}
      {gentleBreakBanner && !isBreakModalOpen && (
        <div className="max-w-6xl mx-auto w-full px-6 pt-4 animate-fadeIn">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl p-4 shadow-lg shadow-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-extrabold">
                  {gentleBreakBanner === 'eye'
                    ? lang === 'en'
                      ? '👀 Time for a 20-second Eye Rest!'
                      : '👀 Đến giờ nghỉ mắt 20-20-20 rồi bạn ơi!'
                    : lang === 'en'
                    ? '🧘 Time to Stand Up & Stretch!'
                    : '🧘 Đến giờ đứng dậy giãn cơ thư giãn rồi!'}
                </p>
                <p className="text-xs text-emerald-50">
                  {lang === 'en'
                    ? 'Gentle Taskbar/Tray reminder active — open the guided exercise whenever you are ready.'
                    : 'Đang ở chế độ nhắc nhẹ dưới Taskbar — bấm vào bên phải khi bạn sẵn sàng tập nhé.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startBreakSession(gentleBreakBanner, true)}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-white text-emerald-700 hover:bg-emerald-50 transition shadow-sm"
              >
                {lang === 'en' ? '🧘 Open Guided Stretch' : '🧘 Mở bài tập ngay'}
              </button>
              <button
                onClick={() => {
                  setGentleBreakBanner(null);
                  completeBreakSession();
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition"
              >
                {lang === 'en' ? '✓ Done' : '✓ Đã nghỉ xong'}
              </button>
              <button
                onClick={() => setGentleBreakBanner(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition"
              >
                {t.laterBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Water Reminder Toast Banner */}
      {waterToastVisible && (
        <div className="max-w-6xl mx-auto w-full px-6 pt-4 animate-fadeIn">
          <div className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-2xl p-4 shadow-lg shadow-sky-500/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div>
                <p className="text-sm font-extrabold">
                  {t.waterToastTitle}
                </p>
                <p className="text-xs text-sky-50">
                  {t.waterToastDesc}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hydrationSettings.quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAddWater(amt)}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-white text-sky-700 hover:bg-sky-50 transition shadow-sm"
                >
                  {t.drankBtn} {amt}ml
                </button>
              ))}
              <button
                onClick={() => setWaterToastVisible(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition"
              >
                {t.laterBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Top 3-Column Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Card 1: Stand-up & Eye Reminder (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-emerald-100/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 whitespace-nowrap">
                      <Activity className="w-3.5 h-3.5 shrink-0" />
                      {t.standupBadge}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                      {t.standupCountLabel} {dailyStats.standupCompletedCount} {t.timesUnit}
                    </span>
                  </div>

                  {/* Mebius Dual Concentric Activity Rings */}
                  <MebiusDualActivityRings
                    standupSecondsLeft={standupSecondsLeft}
                    standupIntervalMinutes={standupSettings.standupIntervalMinutes}
                    eyeSecondsLeft={eyeSecondsLeft}
                    eyeBreakIntervalMinutes={standupSettings.eyeBreakIntervalMinutes}
                    eyeBreakEnabled={standupSettings.eyeBreakEnabled}
                    standupCompletedCount={dailyStats.standupCompletedCount}
                    eyeBreakCompletedCount={dailyStats.eyeBreakCompletedCount}
                    lang={lang}
                  />

                  {/* Secondary Sub-timers: 20-20-20 Eye Break & Idle Detector */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div
                      className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                        passiveEyeCueSec > 0
                          ? 'bg-amber-50 border-amber-300 shadow-sm shadow-amber-500/10 animate-pulse'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          passiveEyeCueSec > 0
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-emerald-100/80 text-emerald-700'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {t.eyeBreak202020}
                        </p>
                        <p
                          className={`text-xs font-bold font-mono ${
                            passiveEyeCueSec > 0 ? 'text-amber-700' : 'text-slate-800'
                          }`}
                        >
                          {!standupSettings.eyeBreakEnabled
                            ? t.disabledLabel
                            : passiveEyeCueSec > 0
                            ? lang === 'en'
                              ? `👀 Blink & look away: ${passiveEyeCueSec}s`
                              : `👀 Chớp mắt & nhìn xa: ${passiveEyeCueSec}s`
                            : formatMMSS(eyeSecondsLeft)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {t.mouseKeyStatus}
                        </p>
                        <p className="text-xs font-bold text-slate-800">
                          {systemIdleSec > 5
                            ? `${t.idleSecPrefix} ${systemIdleSec}s`
                            : t.workingNow}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => startBreakSession('standup', true)}
                    className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-500/20 transition"
                  >
                    {t.standNowBtn}
                  </button>
                  <button
                    onClick={() => startBreakSession('eye', true)}
                    className="py-2.5 px-3.5 rounded-2xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                  >
                    {t.eye20sBtn}
                  </button>
                  <button
                    onClick={() => {
                      const nextStandupSec = standupSettings.standupIntervalMinutes * 60;
                      const nextEyeSec = standupSettings.eyeBreakIntervalMinutes * 60;
                      const nextWaterSec = hydrationSettings.intervalMinutes * 60;
                      setStandupSecondsLeft(nextStandupSec);
                      setEyeSecondsLeft(nextEyeSec);
                      setWaterSecondsLeft(nextWaterSec);
                      setPassiveEyeCueSec(0);
                      syncTimerTargets(nextStandupSec, nextEyeSec, nextWaterSec);
                    }}
                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 2: Smart Hydration Tracker (4 cols) */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-sky-100/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200/70 whitespace-nowrap">
                      <Droplets className="w-3.5 h-3.5 shrink-0" />
                      {t.hydrationBadge}
                    </span>
                    <button
                      onClick={() => triggerVoiceReminder('water')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 whitespace-nowrap"
                    >
                      <Bell className="w-3.5 h-3.5 shrink-0" />
                      {t.remindAfter} {formatMMSS(waterSecondsLeft)}
                    </button>
                  </div>

                  {/* Animated Water Cup / Wave Gauge */}
                  <div className="my-4 flex items-center gap-4 bg-gradient-to-br from-sky-50/80 to-cyan-50/40 p-3.5 rounded-2xl border border-sky-100">
                    <div className="relative w-20 h-28 rounded-b-3xl rounded-t-xl border-4 border-sky-400 bg-white overflow-hidden shadow-inner flex-shrink-0">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-500 to-cyan-300 transition-all duration-700"
                        style={{ height: `${waterProgressPct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className={`text-xs font-extrabold ${
                            waterProgressPct > 55 ? 'text-white' : 'text-sky-700'
                          }`}
                        >
                          {waterProgressPct}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-2xl font-extrabold text-slate-800">
                        {dailyStats.waterIntakeMl}{' '}
                        <span className="text-sm font-semibold text-slate-400">
                          / {hydrationSettings.dailyGoalMl} ml
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {dailyStats.waterIntakeMl >= hydrationSettings.dailyGoalMl
                          ? t.goalCompletedMsg
                          : `${t.needMoreWaterPrefix} ${
                              hydrationSettings.dailyGoalMl -
                              dailyStats.waterIntakeMl
                            } ${t.needMoreWaterSuffix}`}
                      </p>
                      <button
                        onClick={() => handleAddWater(50)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200/70 transition"
                      >
                        <Coffee className="w-3 h-3" /> {t.smallSip50}
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Quick Drink Buttons + Auto-Hiding 5s Undo Button */}
                  <div className="flex items-center justify-between mb-2 min-h-[22px]">
                    <p className="text-xs font-bold text-slate-600">
                      {t.quickDrinkTitle}
                    </p>
                    {undoWaterToast && (
                      <button
                        onClick={handleUndoWater}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-rose-50 text-amber-800 hover:text-rose-600 border border-amber-200 hover:border-rose-200 text-[11px] font-extrabold transition shadow-2xs animate-fadeIn cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {lang === 'en'
                          ? `Undo +${undoWaterToast.amountMl}ml (${undoWaterToast.secondsLeft}s)`
                          : `Hoàn tác +${undoWaterToast.amountMl}ml (${undoWaterToast.secondsLeft}s)`}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 mb-3">
                    {hydrationSettings.quickAmounts.map((amt, i) => (
                      <button
                        key={amt}
                        onClick={() => handleAddWater(amt)}
                        className="py-2.5 px-2 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm shadow-sky-500/15 transition flex flex-col items-center"
                      >
                        <span>+{amt}ml</span>
                        <span className="text-[10px] font-normal text-sky-100">
                          {i === 0 ? t.sipLabel : i === 1 ? t.cupLabel : t.largeGlassLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mebius Hourly Hydration Pill Bar Chart */}
                <MebiusHourlyHydrationChart
                  waterLogs={dailyStats.waterLogs}
                  lang={lang}
                />
              </div>

              {/* Card 3: Virtual Desk Plant & Daily Wellness Milestones (3 cols) */}
              <div className="lg:col-span-3 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                        plantMood === 'sleepy'
                          ? 'bg-indigo-950 text-indigo-200 border-indigo-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200/70'
                      }`}
                    >
                      <Sun className="w-3 h-3 shrink-0" />
                      {plantMood === 'sleepy'
                        ? lang === 'en'
                          ? '🌙 Night Owl'
                          : '🌙 Cú Đêm'
                        : t.deskPlantBadge}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-[10px] font-extrabold text-emerald-700 whitespace-nowrap">
                      {lang === 'en'
                        ? `Lv ${plantStage}/4 • ${plantGrowthPct}%`
                        : `Cấp ${plantStage}/4 • ${plantGrowthPct}%`}
                    </span>
                  </div>

                  <div
                    onClick={() => setQuoteSeed((s) => s + 1)}
                    onMouseEnter={() => setQuoteSeed((s) => s + 1)}
                    className={`my-3 rounded-2xl p-3 border text-center cursor-pointer transition-all ${
                      plantMood === 'sleepy'
                        ? 'bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-900 border-indigo-800 text-indigo-100'
                        : plantMood === 'thirsty'
                        ? 'bg-gradient-to-b from-amber-50/80 to-orange-50/40 border-amber-200/80'
                        : 'bg-gradient-to-b from-emerald-50/50 to-amber-50/30 border-emerald-100/60'
                    }`}
                  >
                    <VirtualDeskPlant
                      growthPercent={plantGrowthPct}
                      mood={plantMood}
                      quote={activePlantQuote}
                      onPokePlant={handlePokePlant}
                    />
                    <p
                      className={`text-xs font-bold mt-1 ${
                        plantMood === 'sleepy'
                          ? 'text-indigo-200'
                          : plantMood === 'thirsty'
                          ? 'text-amber-800'
                          : 'text-slate-700'
                      }`}
                    >
                      {plantMood === 'sleepy'
                        ? lang === 'en'
                          ? '💤 Sprout is sleepy (Late Night OT)'
                          : '💤 Cây đang buồn ngủ (Làm việc khuya)'
                        : plantGrowthPct >= 85
                        ? t.plantBlooming
                        : plantMood === 'thirsty'
                        ? lang === 'en'
                          ? '🥺 Sprout is thirsty — take a sip!'
                          : '🥺 Cây đang khát nước — uống 1 ngụm nhé!'
                        : waterProgressPct >= 100
                        ? lang === 'en'
                          ? '🌿 100% hydrated! Stand up to bloom'
                          : '🌿 Đã đủ 100% nước! Đứng dậy để nở hoa nhé'
                        : plantGrowthPct >= 50
                        ? t.plantGrowing
                        : t.plantSeedling}
                    </p>

                    {/* Interactive Witty Speech Bubble (Click or Hover to cycle quotes) */}
                    <div
                      className={`mt-2.5 p-2.5 rounded-xl text-[11px] font-semibold leading-snug border transition-all ${
                        passiveEyeCueSec > 0
                          ? 'bg-amber-100/90 text-amber-900 border-amber-300 shadow-xs'
                          : plantMood === 'sleepy'
                          ? 'bg-indigo-900/80 text-indigo-100 border-indigo-700/80'
                          : plantMood === 'thirsty'
                          ? 'bg-white/90 text-amber-900 border-amber-200'
                          : 'bg-white/90 text-emerald-900 border-emerald-100'
                      }`}
                    >
                      “{activePlantQuote}”
                    </div>
                  </div>

                  {/* Daily Wellness Growth Breakdown */}
                  <div className="mt-4 space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {lang === 'en' ? '💧 Hydration Goal' : '💧 Mục tiêu nước'}
                      </span>
                      <span className="text-xs font-bold text-sky-600">
                        {waterProgressPct}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {lang === 'en' ? '🧘 Stand-up Breaks' : '🧘 Đứng dậy giãn cơ'}
                      </span>
                      <span className="text-xs font-bold text-emerald-600">
                        {dailyStats.standupCompletedCount} / 8 {t.timesUnit}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {lang === 'en' ? '👀 Eye Rest 20-20-20' : '👀 Nghỉ mắt 20-20-20'}
                      </span>
                      <span className="text-xs font-bold text-amber-600">
                        {dailyStats.eyeBreakCompletedCount} {t.timesUnit}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className="mt-4 w-full py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition"
                >
                  {lang === 'en' ? 'View Full Statistics →' : 'Xem thống kê chi tiết →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <MebiusAnalyticsRow
              dailyStats={dailyStats}
              weeklyHistory={weeklyHistory}
              dailyWaterGoalMl={hydrationSettings.dailyGoalMl}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'sounds' && (
          <React.Suspense fallback={null}>
            <SoundMixerPanel
              activeSounds={activeSounds}
              soundVolumes={soundVolumes}
              masterVolume={masterVolume}
              isMasterMuted={isMasterMuted}
              activeStationUrl={activeStationUrl}
              isRadioPlaying={isRadioPlaying}
              radioVolume={radioVolume}
              radioError={radioError}
              lang={lang}
              onToggleSound={handleToggleSound}
              onChangeSoundVolume={handleChangeSoundVolume}
              onApplyPreset={handleApplyPreset}
              onStopAllSounds={handleStopAllSounds}
              onChangeMasterVolume={(vol) => {
                setMasterVolume(vol);
                soundEngine.setMasterVolume(vol);
              }}
              onToggleMasterMute={() => {
                const muted = soundEngine.toggleMasterMute();
                setIsMasterMuted(muted);
              }}
              onPlayRadioStream={handlePlayRadioStream}
              onStopRadio={handleStopRadio}
              onChangeRadioVolume={(vol) => {
                setRadioVolume(vol);
                soundEngine.setRadioVolume(vol);
              }}
            />
          </React.Suspense>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {availableUpdateVersion && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-extrabold text-emerald-900">
                      {lang === 'en'
                        ? `Update v${availableUpdateVersion} is downloaded and ready`
                        : `Bản cập nhật v${availableUpdateVersion} đã tải ngầm sẵn sàng`}
                    </h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {lang === 'en'
                        ? 'Click to restart in 1 second, or it will automatically apply the next time you turn on your computer.'
                        : 'Nhấn để khởi động lại trong 1 giây, hoặc bản mới sẽ tự động áp dụng vào lần bật máy tiếp theo.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void handleInstallUpdate()}
                  disabled={isUpdatingApp}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition whitespace-nowrap cursor-pointer disabled:opacity-60"
                >
                  {isUpdatingApp
                    ? lang === 'en'
                      ? 'Restarting...'
                      : 'Đang khởi động lại...'
                    : lang === 'en'
                    ? 'Restart and Update'
                    : 'Khởi động lại và Cập nhật'}
                </button>
              </div>
            )}
            <React.Suspense fallback={null}>
              <SettingsPanel
                standupSettings={standupSettings}
                hydrationSettings={hydrationSettings}
                voiceSettings={voiceSettings}
                autostartEnabled={autostartEnabled}
                startMinimized={startMinimized}
                isTestingVoice={isTestingVoice}
                lastDuckedCount={duckedAppsCount}
                lang={lang}
                syncStatus={syncStatus}
                syncError={syncError}
                activeSyncCode={activeSyncCode}
                userEmail={userEmail}
                lastSyncedDevice={lastSyncedDevice}
                lastSyncedAt={lastSyncedAt}
                connectedDevices={connectedDevices}
                onConnectSyncCode={handleConnectSyncCode}
                onDisconnectSync={handleDisconnectSync}
                onGoogleSignIn={handleGoogleSignIn}
                onEmailAuth={handleEmailAuth}
                onLogoutAccount={handleLogoutAccount}
                onForceSyncNow={handleForceSyncNow}
                onUpdateStandup={(partial) => {
                  const now = Date.now();
                  setStandupSettings((prev) => {
                    const updated = { ...prev, ...partial };
                    if (partial.standupIntervalMinutes) {
                      const sec = partial.standupIntervalMinutes * 60;
                      setStandupSecondsLeft(sec);
                      updated.nextStandupAt = now + sec * 1000;
                      updated.timerSyncUpdatedAt = now;
                    }
                    if (partial.eyeBreakIntervalMinutes) {
                      const sec = partial.eyeBreakIntervalMinutes * 60;
                      setEyeSecondsLeft(sec);
                      updated.nextEyeAt = now + sec * 1000;
                      updated.timerSyncUpdatedAt = now;
                    }
                    return updated;
                  });
                }}
                onUpdateHydration={(partial) => {
                  setHydrationSettings((prev) => {
                    const updated = { ...prev, ...partial };
                    if (partial.intervalMinutes) {
                      const sec = partial.intervalMinutes * 60;
                      setWaterSecondsLeft(sec);
                      syncTimerTargets(undefined, undefined, sec);
                    }
                    return updated;
                  });
                }}
                onUpdateVoice={(partial) =>
                  setVoiceSettings((prev) => ({ ...prev, ...partial }))
                }
                onToggleAutostart={async (enabled, minimized) => {
                  setAutostartEnabled(enabled);
                  setStartMinimized(minimized);
                  await setAutostartStatus(enabled, minimized);
                }}
                onTestVietnameseVoice={async () => {
                  setIsTestingVoice(true);
                  await triggerVoiceReminder('test');
                  setIsTestingVoice(false);
                }}
              />
            </React.Suspense>
          </div>
        )}
      </main>

      {/* Guided Break & Stretch Overlay Modal */}
      {isBreakModalOpen && (
        <React.Suspense fallback={null}>
          <BreakOverlayModal
            isOpen={isBreakModalOpen}
            breakType={currentBreakType}
            remainingSeconds={breakRemainingSec}
            totalSeconds={breakTotalSec}
            holdToSkip={standupSettings.holdToSkip}
            duckedAppsCount={duckedAppsCount}
            lang={lang}
            onCompleteBreak={completeBreakSession}
            onSnoozeBreak={snoozeBreakSession}
            onSkipBreak={skipBreakSession}
            onQuickDrinkWater={handleAddWater}
            onReplayVoice={() => triggerVoiceReminder(currentBreakType)}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default App;

