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
  mergeDailyStats,
  mergeWeeklyHistory,
} from './services/firebaseSync';
import { BreakOverlayModal } from './components/BreakOverlayModal';
import { VirtualDeskPlant } from './components/ExerciseIllustration';
import {
  MebiusAnalyticsRow,
  MebiusDualActivityRings,
  MebiusHourlyHydrationChart,
} from './components/MebiusAnalyticsRow';
import { SettingsPanel } from './components/SettingsPanel';
import { SoundMixerPanel } from './components/SoundMixerPanel';
import {
  AMBIENT_SOUNDS,
  SOUND_PRESETS,
} from './data/wellnessCatalog';
import { soundEngine } from './services/soundEngine';
import {
  closeWebMusicPlayer,
  getAutostartStatus,
  getSystemContext,
  hideWindowToTray,
  onTauriEvent,
  openWebMusicPlayer,
  sendTrayNotification,
  setAutostartStatus,
  setTrayLanguage,
  setWindowAlwaysOnTop,
  showAndFocusWindow,
} from './services/tauriBridge';
import { AppLanguage, TRANSLATIONS } from './i18n/translations';
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

  // 1. Settings States
  const [standupSettings, setStandupSettings] = useState<StandupSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STANDUP);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      standupIntervalMinutes: 45,
      standupDurationSeconds: 180,
      eyeBreakEnabled: true,
      eyeBreakIntervalMinutes: 20,
      eyeBreakDurationSeconds: 20,
      autoResetIdleSeconds: 300,
      pauseOnFullscreen: true,
      reminderMode: 'overlay',
      holdToSkip: true,
    };
  });

  const [hydrationSettings, setHydrationSettings] = useState<HydrationSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HYDRATION);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      dailyGoalMl: 1800,
      weightKg: 60,
      intervalMinutes: 40,
      quickAmounts: [100, 200, 300],
    };
  });

  const [voiceSettings, setVoiceSettings] = useState<VoiceReminderSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VOICE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
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
  });

  // 2. Daily Wellness Stats & 7-Day History
  const [weeklyHistory, setWeeklyHistory] = useState<DailyWellnessStats[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.WEEKLY_HISTORY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [dailyStats, setDailyStats] = useState<DailyWellnessStats>(() => {
    const today = getTodayString();
    const saved = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    if (saved) {
      try {
        const parsed: DailyWellnessStats = JSON.parse(saved);
        if (parsed.date === today) {
          return parsed;
        }
      } catch {
        // fallback
      }
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

  // Water Toast Notification Banner & Gentle Taskbar/Tray Break Banner
  const [waterToastVisible, setWaterToastVisible] = useState<boolean>(false);
  const [gentleBreakBanner, setGentleBreakBanner] = useState<BreakType | null>(null);

  // System Context & Audio Ducking Status
  const [systemIdleSec, setSystemIdleSec] = useState<number>(0);
  const [isFullscreenApp, setIsFullscreenApp] = useState<boolean>(false);
  const [duckedAppsCount, setDuckedAppsCount] = useState<number>(0);
  const [isDuckedActive, setIsDuckedActive] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // Autostart Status
  const [autostartEnabled, setAutostartEnabled] = useState<boolean>(false);
  const [startMinimized, setStartMinimized] = useState<boolean>(true);

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

  // Save settings to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STANDUP, JSON.stringify(standupSettings));
  }, [standupSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HYDRATION, JSON.stringify(hydrationSettings));
  }, [hydrationSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VOICE, JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(dailyStats));
    setWeeklyHistory((prev) => {
      const filtered = prev.filter((item) => item.date !== dailyStats.date);
      const updated = [...filtered, dailyStats].slice(-14);
      localStorage.setItem(STORAGE_KEYS.WEEKLY_HISTORY, JSON.stringify(updated));
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
        localStorage.setItem(STORAGE_KEYS.WEEKLY_HISTORY, JSON.stringify(merged));
        return merged;
      });
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
    await setWindowAlwaysOnTop(false);

    if (currentBreakType === 'eye') {
      setEyeSecondsLeft(standupSettings.eyeBreakIntervalMinutes * 60);
      setDailyStats((prev) => ({
        ...prev,
        eyeBreakCompletedCount: prev.eyeBreakCompletedCount + 1,
      }));
    } else {
      setStandupSecondsLeft(standupSettings.standupIntervalMinutes * 60);
      setEyeSecondsLeft(standupSettings.eyeBreakIntervalMinutes * 60);
      setDailyStats((prev) => ({
        ...prev,
        standupCompletedCount: prev.standupCompletedCount + 1,
      }));
    }

    await triggerVoiceReminder('break_done');
  }, [
    currentBreakType,
    standupSettings.eyeBreakIntervalMinutes,
    standupSettings.standupIntervalMinutes,
    triggerVoiceReminder,
  ]);

  // Snooze Break Session
  const snoozeBreakSession = useCallback(async (minutes: number) => {
    setIsBreakModalOpen(false);
    await setWindowAlwaysOnTop(false);
    setStandupSecondsLeft(minutes * 60);
  }, []);

  // Skip Break Session
  const skipBreakSession = useCallback(async () => {
    setIsBreakModalOpen(false);
    await setWindowAlwaysOnTop(false);
    if (currentBreakType === 'eye') {
      setEyeSecondsLeft(standupSettings.eyeBreakIntervalMinutes * 60);
    } else {
      setStandupSecondsLeft(standupSettings.standupIntervalMinutes * 60);
    }
  }, [
    currentBreakType,
    standupSettings.eyeBreakIntervalMinutes,
    standupSettings.standupIntervalMinutes,
  ]);

  // Add Water Intake
  const handleAddWater = useCallback(
    (amountMl: number) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

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
              id: `${Date.now()}-${Math.random()}`,
              timestamp: timeStr,
              amountMl,
            },
            ...prev.waterLogs.slice(0, 14),
          ],
        };
      });

      // Reset water reminder timer on drink
      setWaterSecondsLeft(hydrationSettings.intervalMinutes * 60);
      setWaterToastVisible(false);
    },
    [hydrationSettings.dailyGoalMl, hydrationSettings.intervalMinutes]
  );

  // Listen to System Tray Menu Events from Rust Backend
  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    onTauriEvent<number>('tray-add-water', (amount) => {
      handleAddWater(amount || 200);
    }).then((unlisten) => unlisteners.push(unlisten));

    onTauriEvent<string>('tray-trigger-break', () => {
      startBreakSession('standup', true);
    }).then((unlisten) => unlisteners.push(unlisten));

    onTauriEvent<boolean>('tray-toggle-music', (hasZingWindow) => {
      if (soundEngine.isAnySoundPlaying()) {
        const muted = soundEngine.toggleMasterMute();
        setIsMasterMuted(muted);
      } else if (!hasZingWindow) {
        // Only start default rain preset if Zing MP3 is NOT open
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

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [handleAddWater, startBreakSession]);

  // Main 1-Second Heartbeat Tick
  const tickCounterRef = useRef<number>(0);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      tickCounterRef.current += 1;

      // Poll Windows Idle & Fullscreen every 3 seconds
      if (tickCounterRef.current % 3 === 0) {
        const ctx = await getSystemContext();
        setSystemIdleSec(ctx.idle_seconds);
        setIsFullscreenApp(ctx.is_fullscreen);

        // Auto-reset standup timer if user has been away from computer > threshold
        if (
          ctx.idle_seconds >= standupSettings.autoResetIdleSeconds &&
          !isBreakModalOpen
        ) {
          setStandupSecondsLeft(standupSettings.standupIntervalMinutes * 60);
          setEyeSecondsLeft(standupSettings.eyeBreakIntervalMinutes * 60);
          return;
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

      // 1. Standup Countdown
      setStandupSecondsLeft((prev) => {
        if (prev <= 1) {
          if (standupSettings.pauseOnFullscreen && isFullscreenApp) {
            // Postpone by 2 minutes if user is in fullscreen meeting/presentation
            return 120;
          }
          // If water timer is also close (< 5 mins), trigger a unified Combo Break + Water reminder!
          const isWaterClose = waterSecondsLeft <= 300;
          if (isWaterClose) {
            setWaterSecondsLeft(hydrationSettings.intervalMinutes * 60);
            startBreakSession('combo');
          } else {
            startBreakSession('standup');
          }
          return standupSettings.standupIntervalMinutes * 60;
        }
        return prev - 1;
      });

      // 2. Eye 20-20-20 Countdown
      if (standupSettings.eyeBreakEnabled) {
        setEyeSecondsLeft((prev) => {
          if (prev <= 1) {
            if (standupSettings.pauseOnFullscreen && isFullscreenApp) {
              return 120;
            }
            // Avoid clashing if standup break is within 2 minutes
            if (standupSecondsLeft > 120) {
              startBreakSession('eye');
            }
            return standupSettings.eyeBreakIntervalMinutes * 60;
          }
          return prev - 1;
        });
      }

      // 3. Hydration Reminder Countdown
      setWaterSecondsLeft((prev) => {
        if (prev <= 1) {
          setWaterToastVisible(true);
          sendTrayNotification(t.waterToastTitle, t.waterToastDesc);
          triggerVoiceReminder('water');
          return hydrationSettings.intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    completeBreakSession,
    hydrationSettings.intervalMinutes,
    isBreakModalOpen,
    isFullscreenApp,
    isPaused,
    standupSecondsLeft,
    standupSettings.autoResetIdleSeconds,
    standupSettings.eyeBreakEnabled,
    standupSettings.eyeBreakIntervalMinutes,
    standupSettings.pauseOnFullscreen,
    standupSettings.standupIntervalMinutes,
    startBreakSession,
    triggerVoiceReminder,
    waterSecondsLeft,
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

  // Desk Plant Growth combines Water Goal % and Standup Sessions
  const plantGrowthPct = Math.min(
    100,
    Math.round(waterProgressPct * 0.6 + Math.min(40, dailyStats.standupCompletedCount * 10))
  );

  const anySoundActive =
    Object.values(activeSounds).some(Boolean) || isRadioPlaying;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-slate-50 to-sky-50/80 text-slate-800 flex flex-col">
      {/* Top Minimalist Daylight Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/70 px-5 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                v1.1
              </span>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'settings'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              {t.navSettings}
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top 3-Column Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Card 1: Stand-up & Eye Reminder (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-emerald-100/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                      <Activity className="w-3.5 h-3.5" />
                      {t.standupBadge}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
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
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {t.eyeBreak202020}
                        </p>
                        <p className="text-xs font-bold text-slate-800 font-mono">
                          {standupSettings.eyeBreakEnabled
                            ? formatMMSS(eyeSecondsLeft)
                            : t.disabledLabel}
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
                      setStandupSecondsLeft(
                        standupSettings.standupIntervalMinutes * 60
                      );
                      setEyeSecondsLeft(
                        standupSettings.eyeBreakIntervalMinutes * 60
                      );
                    }}
                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 2: Smart Hydration Tracker (4 cols) */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-sky-100/90 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200/70">
                      <Droplets className="w-3.5 h-3.5" />
                      {t.hydrationBadge}
                    </span>
                    <button
                      onClick={() => triggerVoiceReminder('water')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {t.remindAfter} {formatMMSS(waterSecondsLeft)}
                    </button>
                  </div>

                  {/* Animated Water Cup / Wave Gauge */}
                  <div className="my-5 flex items-center gap-5 bg-gradient-to-br from-sky-50/80 to-cyan-50/40 p-4 rounded-2xl border border-sky-100">
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

                  {/* 1-Click Quick Drink Buttons */}
                  <p className="text-xs font-bold text-slate-600 mb-2">
                    {t.quickDrinkTitle}
                  </p>
                  <div className="grid grid-cols-3 gap-2.5 mb-4">
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
                  {/* Mebius Hourly Hydration Pill Bar Chart */}
                  <MebiusHourlyHydrationChart
                    waterLogs={dailyStats.waterLogs}
                    lang={lang}
                  />
                </div>

                {/* Recent Drink Logs */}
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t.todayLogsLabel} ({dailyStats.waterLogs.length})
                    </span>
                    {dailyStats.waterLogs.length > 0 && (
                      <button
                        onClick={() =>
                          setDailyStats((prev) => ({
                            ...prev,
                            waterIntakeMl: 0,
                            waterLogs: [],
                          }))
                        }
                        className="text-[11px] text-slate-400 hover:text-rose-500 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> {t.resetBtn}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {dailyStats.waterLogs.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        {t.noWaterLogsYet}
                      </span>
                    ) : (
                      dailyStats.waterLogs.slice(0, 5).map((log) => (
                        <span
                          key={log.id}
                          className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 text-[11px] font-semibold whitespace-nowrap"
                        >
                          {log.timestamp} • +{log.amountMl}ml
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Virtual Desk Plant & Daily Wellness Milestones (3 cols) */}
              <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                      <Sun className="w-3.5 h-3.5" />
                      {t.deskPlantBadge}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      {plantGrowthPct}%
                    </span>
                  </div>

                  <div className="my-3 bg-gradient-to-b from-emerald-50/50 to-amber-50/30 rounded-2xl p-3 border border-emerald-100/60 text-center">
                    <VirtualDeskPlant growthPercent={plantGrowthPct} />
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {plantGrowthPct >= 85
                        ? t.plantBlooming
                        : plantGrowthPct >= 50
                        ? t.plantGrowing
                        : t.plantSeedling}
                    </p>
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
        )}

        {activeTab === 'settings' && (
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
              setStandupSettings((prev) => {
                const updated = { ...prev, ...partial };
                if (partial.standupIntervalMinutes) {
                  setStandupSecondsLeft(partial.standupIntervalMinutes * 60);
                }
                if (partial.eyeBreakIntervalMinutes) {
                  setEyeSecondsLeft(partial.eyeBreakIntervalMinutes * 60);
                }
                return updated;
              });
            }}
            onUpdateHydration={(partial) => {
              setHydrationSettings((prev) => {
                const updated = { ...prev, ...partial };
                if (partial.intervalMinutes) {
                  setWaterSecondsLeft(partial.intervalMinutes * 60);
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
        )}
      </main>

      {/* Guided Break & Stretch Overlay Modal */}
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
    </div>
  );
};

export default App;

