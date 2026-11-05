import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
} from 'firebase/firestore';
import {
  DailyWellnessStats,
  HydrationSettings,
  StandupSettings,
  VoiceReminderSettings,
  WaterLogEntry,
} from '../types/wellness';
import {
  getHardwareDeviceInfo,
  startGoogleOAuthLoopback,
} from './tauriBridge';

export interface FirebaseConfigPayload {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface ConnectedDeviceMetadata {
  uid: string;
  name: string;
  os: string;
  lastSeenAt: number;
}

export interface CloudWellnessDocument {
  syncCode?: string;
  ownerUid?: string;
  linkedUids?: string[];
  connectedDevices?: ConnectedDeviceMetadata[];
  updatedAt: number;
  lastDeviceName: string;
  dailyStats: DailyWellnessStats;
  weeklyHistory: DailyWellnessStats[];
  standupSettings: StandupSettings;
  hydrationSettings: HydrationSettings;
  voiceSettings: VoiceReminderSettings;
  activeSyncCode?: string;
}

export type SyncConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'synced'
  | 'offline_cached'
  | 'error';

const FIREBASE_CONFIG_STORAGE_KEY = 'deskaura_firebase_config_v1';
const SYNC_CODE_STORAGE_KEY = 'deskaura_sync_code_v1';
const DEVICE_NAME_STORAGE_KEY = 'deskaura_device_name_v1';
const HARDWARE_ID_STORAGE_KEY = 'deskaura_hardware_id_v1';

const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

// Default Firebase configuration for DeskAura Wellness Sync (deskaura-wellness-sync)
const DEFAULT_DESKAURA_FIREBASE_CONFIG: FirebaseConfigPayload = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || 'AIzaSyAtLQ6QnQWT3a5rkxkFIdutwOgIXUXaXp0',
  authDomain:
    viteEnv.VITE_FIREBASE_AUTH_DOMAIN || 'deskaura-wellness-sync.firebaseapp.com',
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || 'deskaura-wellness-sync',
  storageBucket:
    viteEnv.VITE_FIREBASE_STORAGE_BUCKET ||
    'deskaura-wellness-sync.firebasestorage.app',
  messagingSenderId:
    viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '1017938473342',
  appId:
    viteEnv.VITE_FIREBASE_APP_ID || '1:1017938473342:web:d04594f1751072c4b4832f',
};

let cachedHardwareId: string | null = null;
let cachedHardwareOS: string | null = null;

export function getDetectedOS(): string {
  if (cachedHardwareOS) return cachedHardwareOS;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Desktop';
}

export function getDefaultDeviceName(): string {
  const saved = localStorage.getItem(DEVICE_NAME_STORAGE_KEY);
  if (saved) return saved;

  const ua = navigator.userAgent || '';
  let detected = 'DeskAura Device';
  if (/Macintosh|Mac OS X/i.test(ua)) {
    detected = 'MacBook (macOS)';
  } else if (/Windows/i.test(ua)) {
    detected = 'Windows PC';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    detected = 'iPhone / iPad';
  }
  localStorage.setItem(DEVICE_NAME_STORAGE_KEY, detected);
  return detected;
}

export async function ensureHardwareIdentity(): Promise<string> {
  if (cachedHardwareId) return cachedHardwareId;

  const hwInfo = await getHardwareDeviceInfo();
  if (hwInfo && hwInfo.hardware_id) {
    cachedHardwareId = hwInfo.hardware_id;
    cachedHardwareOS = hwInfo.os;
    localStorage.setItem(HARDWARE_ID_STORAGE_KEY, hwInfo.hardware_id);
    const savedName = localStorage.getItem(DEVICE_NAME_STORAGE_KEY);
    if (
      !savedName ||
      savedName === 'MacBook / macOS' ||
      savedName === 'DeskAura Device'
    ) {
      localStorage.setItem(DEVICE_NAME_STORAGE_KEY, hwInfo.device_name);
    }
    return cachedHardwareId;
  }

  let storedId = localStorage.getItem(HARDWARE_ID_STORAGE_KEY);
  if (!storedId) {
    storedId = `web-${getDetectedOS().toLowerCase()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    localStorage.setItem(HARDWARE_ID_STORAGE_KEY, storedId);
  }
  cachedHardwareId = storedId;
  return cachedHardwareId;
}

export function getCachedHardwareId(): string {
  return cachedHardwareId || localStorage.getItem(HARDWARE_ID_STORAGE_KEY) || '';
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function mergeConnectedDevices(
  existing: ConnectedDeviceMetadata[] | undefined,
  hardwareDeviceId: string
): ConnectedDeviceMetadata[] {
  const now = Date.now();
  const byUid = new Map<string, ConnectedDeviceMetadata>();
  (existing || []).forEach((dev) => {
    // Housekeeping: automatically prune ghost devices inactive for > 7 days
    if (dev && dev.uid && now - (dev.lastSeenAt || 0) <= SEVEN_DAYS_MS) {
      byUid.set(dev.uid, dev);
    }
  });
  byUid.set(hardwareDeviceId, {
    uid: hardwareDeviceId,
    name: getDefaultDeviceName(),
    os: getDetectedOS(),
    lastSeenAt: now,
  });
  return Array.from(byUid.values())
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .slice(0, 15);
}

export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_STORAGE_KEY, name.trim() || 'DeskAura Device');
}

export function generateAuraSyncCode(): string {
  return '';
}

export function normalizeSyncCode(input: string): string {
  return input.trim().toLowerCase();
}

export function mergeStandupSettings(
  local: StandupSettings,
  remote: StandupSettings
): StandupSettings {
  const now = Date.now();
  const localTs = local.timerSyncUpdatedAt || 0;
  const remoteTs = remote.timerSyncUpdatedAt || 0;
  const newer = remoteTs > localTs ? remote : local;
  const localActiveTs = local.lastActiveAt || 0;
  const remoteActiveTs = remote.lastActiveAt || 0;
  const newerActive = remoteActiveTs > localActiveTs ? remote : local;

  const fallbackStandupAt =
    local.nextStandupAt ||
    remote.nextStandupAt ||
    now + (newer.standupIntervalMinutes || 60) * 60 * 1000;
  const fallbackEyeAt =
    local.nextEyeAt ||
    remote.nextEyeAt ||
    now + (newer.eyeBreakIntervalMinutes || 20) * 60 * 1000;
  const fallbackWaterAt =
    local.nextWaterAt ||
    remote.nextWaterAt ||
    now + (newer.standupIntervalMinutes || 60) * 60 * 1000;

  return {
    ...local,
    ...newer,
    nextStandupAt: newer.nextStandupAt ?? fallbackStandupAt,
    nextEyeAt: newer.nextEyeAt ?? fallbackEyeAt,
    nextWaterAt: newer.nextWaterAt ?? fallbackWaterAt,
    timerSyncUpdatedAt: Math.max(localTs, remoteTs, now),
    lastActiveAt: newerActive.lastActiveAt ?? now,
    lastActiveDeviceId:
      newerActive.lastActiveDeviceId || getCachedHardwareId() || 'local',
  };
}

/**
 * Deduplicated Union Merge for DailyWellnessStats across devices.
 * Prevents any device from overwriting water logs or standup counts made on another device!
 */
export function mergeDailyStats(
  local: DailyWellnessStats,
  remote: DailyWellnessStats
): DailyWellnessStats {
  if (remote.date < local.date) {
    return local;
  }
  if (remote.date > local.date) {
    return remote;
  }

  const logMap = new Map<string, WaterLogEntry>();
  [...(remote.waterLogs || []), ...(local.waterLogs || [])].forEach((entry) => {
    if (entry && entry.id) {
      logMap.set(entry.id, entry);
    }
  });

  const mergedLogs = Array.from(logMap.values())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 25);

  const sumFromLogs = mergedLogs.reduce((acc, item) => acc + (item.amountMl || 0), 0);
  const mergedWaterIntake = Math.max(
    local.waterIntakeMl || 0,
    remote.waterIntakeMl || 0,
    sumFromLogs
  );

  return {
    date: local.date,
    waterIntakeMl: mergedWaterIntake,
    waterLogs: mergedLogs,
    standupCompletedCount: Math.max(
      local.standupCompletedCount || 0,
      remote.standupCompletedCount || 0
    ),
    eyeBreakCompletedCount: Math.max(
      local.eyeBreakCompletedCount || 0,
      remote.eyeBreakCompletedCount || 0
    ),
    focusMinutes: Math.max(local.focusMinutes || 0, remote.focusMinutes || 0),
  };
}

/**
 * Merges 7-to-14-day history arrays across multiple devices by date.
 */
export function mergeWeeklyHistory(
  localHistory: DailyWellnessStats[],
  remoteHistory: DailyWellnessStats[]
): DailyWellnessStats[] {
  const byDate = new Map<string, DailyWellnessStats>();

  (remoteHistory || []).forEach((item) => {
    if (item && item.date) {
      byDate.set(item.date, item);
    }
  });

  (localHistory || []).forEach((item) => {
    if (!item || !item.date) return;
    const existing = byDate.get(item.date);
    if (existing) {
      byDate.set(item.date, mergeDailyStats(item, existing));
    } else {
      byDate.set(item.date, item);
    }
  });

  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

class FirebaseSyncService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;
  private unsubscribeAuth: (() => void) | null = null;
  private currentUser: User | null = null;

  public getSavedConfig(): FirebaseConfigPayload {
    const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_DESKAURA_FIREBASE_CONFIG;
  }

  public saveConfig(config: FirebaseConfigPayload): void {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }

  public getSavedSyncCode(): string {
    const saved = localStorage.getItem(SYNC_CODE_STORAGE_KEY) || '';
    // Only keep valid email sync codes; discard legacy AURA- codes
    if (saved.includes('@')) {
      return saved.trim().toLowerCase();
    }
    if (saved) {
      localStorage.removeItem(SYNC_CODE_STORAGE_KEY);
    }
    return '';
  }

  public saveSyncCode(code: string): void {
    const normalized = normalizeSyncCode(code);
    if (normalized && normalized.includes('@')) {
      localStorage.setItem(SYNC_CODE_STORAGE_KEY, normalized);
    } else {
      localStorage.removeItem(SYNC_CODE_STORAGE_KEY);
    }
  }

  public init(config?: FirebaseConfigPayload): { ok: boolean; error?: string } {
    const targetConfig = config || this.getSavedConfig();
    if (!targetConfig || !targetConfig.apiKey || !targetConfig.projectId) {
      return { ok: false, error: 'Missing Firebase configuration' };
    }

    try {
      if (!getApps().length) {
        this.app = initializeApp(targetConfig);
        try {
          this.db = initializeFirestore(this.app, {
            ignoreUndefinedProperties: true,
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          });
        } catch {
          this.db = getFirestore(this.app);
        }
      } else {
        this.app = getApps()[0];
        this.db = getFirestore(this.app);
      }

      this.auth = getAuth(this.app);

      if (config) {
        this.saveConfig(config);
      }

      // Initialize hardware identity in background
      ensureHardwareIdentity().catch(() => {});

      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.getSavedConfig());
  }

  public onUserChange(callback: (user: User | null) => void): () => void {
    if (!this.auth) {
      const res = this.init();
      if (!res.ok || !this.auth) {
        callback(null);
        return () => {};
      }
    }

    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }

    this.unsubscribeAuth = onAuthStateChanged(this.auth, (user) => {
      if (user && !user.isAnonymous && user.email) {
        this.currentUser = user;
        this.saveSyncCode(user.email);
        callback(user);
      } else {
        this.currentUser = null;
        this.saveSyncCode('');
        callback(null);
      }
    });

    return () => {
      if (this.unsubscribeAuth) {
        this.unsubscribeAuth();
        this.unsubscribeAuth = null;
      }
    };
  }

  public async signInWithGoogle(): Promise<User> {
    if (!this.auth) {
      const res = this.init();
      if (!res.ok || !this.auth) {
        throw new Error(res.error || 'Firebase chưa được khởi tạo');
      }
    }

    const isTauri =
      typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    if (isTauri) {
      const cfg = this.getSavedConfig();
      const idToken = await startGoogleOAuthLoopback(
        cfg.apiKey,
        cfg.authDomain,
        cfg.projectId
      );
      const credential = GoogleAuthProvider.credential(idToken);
      const cred = await signInWithCredential(this.auth, credential);
      this.currentUser = cred.user;
      if (cred.user.email) {
        this.saveSyncCode(cred.user.email);
      }
      return cred.user;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(this.auth, provider);
    this.currentUser = cred.user;
    if (cred.user.email) {
      this.saveSyncCode(cred.user.email);
    }
    return cred.user;
  }

  public async signInWithEmail(
    email: string,
    password: string,
    isRegister: boolean
  ): Promise<User> {
    if (!this.auth) {
      const res = this.init();
      if (!res.ok || !this.auth) {
        throw new Error(res.error || 'Firebase chưa được khởi tạo');
      }
    }
    const cred = isRegister
      ? await createUserWithEmailAndPassword(this.auth, email.trim(), password)
      : await signInWithEmailAndPassword(this.auth, email.trim(), password);
    this.currentUser = cred.user;
    if (cred.user.email) {
      this.saveSyncCode(cred.user.email);
    }
    return cred.user;
  }

  /**
   * Unlinks this physical machine's Hardware ID from the current Gmail room before signing out!
   * Ensures that if Machine 2 switches from Gmail 1 to Gmail 2, Gmail 1 immediately drops Machine 2.
   */
  public async logout(): Promise<void> {
    this.stopListening();
    try {
      const currentEmail = this.currentUser?.email?.trim().toLowerCase();
      if (currentEmail && this.db) {
        const hwId = await ensureHardwareIdentity();
        const docRef = doc(this.db, 'sync_rooms', currentEmail);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as CloudWellnessDocument;
          const remainingDevices = (data.connectedDevices || []).filter(
            (d) => d.uid !== hwId
          );
          await setDoc(
            docRef,
            {
              ...data,
              connectedDevices: remainingDevices,
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        }
      }
    } catch {
      // ignore offline unlink errors
    }

    this.saveSyncCode('');
    if (this.auth) {
      await signOut(this.auth);
      this.currentUser = null;
    }
  }

  /**
   * Starts real-time listener on `/sync_rooms/{gmail}` using the authenticated Gmail address as the Room ID.
   * Each physical computer is tracked inside `connectedDevices` via its permanent Hardware ID (`IOPlatformUUID` / `MachineGuid`).
   */
  public async startRealtimeSync(
    _syncCode: string | null,
    initialLocalData: Omit<CloudWellnessDocument, 'updatedAt' | 'lastDeviceName'>,
    onRemoteData: (docData: CloudWellnessDocument) => void,
    onStatusChange: (status: SyncConnectionStatus, errorMsg?: string) => void
  ): Promise<void> {
    try {
      if (!this.auth) {
        this.init();
      }
      const user = this.auth?.currentUser || this.currentUser;
      if (!user || user.isAnonymous || !user.email) {
        onStatusChange('disconnected');
        return;
      }

      onStatusChange('connecting');
      if (!this.db) {
        throw new Error('Firestore chưa sẵn sàng');
      }

      this.stopListening();

      const emailKey = user.email.trim().toLowerCase();
      this.saveSyncCode(emailKey);
      const hwId = await ensureHardwareIdentity();
      const targetDocRef = doc(this.db, 'sync_rooms', emailKey);

      const existingSnap = await getDoc(targetDocRef);
      if (!existingSnap.exists()) {
        const seedPayload: CloudWellnessDocument = {
          syncCode: emailKey,
          ownerUid: user.uid,
          linkedUids: [user.uid],
          connectedDevices: mergeConnectedDevices([], hwId),
          updatedAt: Date.now(),
          lastDeviceName: getDefaultDeviceName(),
          dailyStats: initialLocalData.dailyStats,
          weeklyHistory: initialLocalData.weeklyHistory.slice(-14),
          standupSettings: initialLocalData.standupSettings,
          hydrationSettings: initialLocalData.hydrationSettings,
          voiceSettings: initialLocalData.voiceSettings,
        };
        await setDoc(targetDocRef, seedPayload);
      } else {
        const existingData = existingSnap.data() as CloudWellnessDocument;
        const mergedDaily = existingData?.dailyStats
          ? mergeDailyStats(initialLocalData.dailyStats, existingData.dailyStats)
          : initialLocalData.dailyStats;
        const mergedHistory = existingData?.weeklyHistory
          ? mergeWeeklyHistory(
              initialLocalData.weeklyHistory,
              existingData.weeklyHistory
            )
          : initialLocalData.weeklyHistory.slice(-14);

        const ownerUid = existingData?.ownerUid || user.uid;
        const linkedSet = new Set<string>(existingData?.linkedUids || [ownerUid]);
        linkedSet.add(user.uid);
        await setDoc(targetDocRef, {
          syncCode: emailKey,
          ownerUid,
          linkedUids: Array.from(linkedSet).slice(0, 15),
          connectedDevices: mergeConnectedDevices(
            existingData?.connectedDevices,
            hwId
          ),
          updatedAt: Date.now(),
          lastDeviceName: getDefaultDeviceName(),
          dailyStats: mergedDaily,
          weeklyHistory: mergedHistory,
          standupSettings: existingData?.standupSettings
            ? mergeStandupSettings(
                initialLocalData.standupSettings,
                existingData.standupSettings
              )
            : initialLocalData.standupSettings,
          hydrationSettings:
            existingData?.hydrationSettings || initialLocalData.hydrationSettings,
          voiceSettings:
            existingData?.voiceSettings || initialLocalData.voiceSettings,
        });
      }

      this.unsubscribeSnapshot = onSnapshot(
        targetDocRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as CloudWellnessDocument;
            onStatusChange(
              snapshot.metadata.fromCache ? 'offline_cached' : 'synced'
            );
            onRemoteData(data);
          }
        },
        (err) => {
          onStatusChange('error', err.message);
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onStatusChange('error', msg);
    }
  }

  public async pushUpdate(
    _syncCode: string | null,
    payload: Omit<CloudWellnessDocument, 'updatedAt' | 'lastDeviceName'>
  ): Promise<void> {
    if (!this.db) return;
    const user = this.auth?.currentUser || this.currentUser;
    if (!user || user.isAnonymous || !user.email) return;

    const emailKey = user.email.trim().toLowerCase();
    const hwId = await ensureHardwareIdentity();
    const targetDocRef = doc(this.db, 'sync_rooms', emailKey);

    const existingSnap = await getDoc(targetDocRef);
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as CloudWellnessDocument)
      : null;

    const mergedDaily = existingData?.dailyStats
      ? mergeDailyStats(payload.dailyStats, existingData.dailyStats)
      : payload.dailyStats;

    const mergedHistory = existingData?.weeklyHistory
      ? mergeWeeklyHistory(payload.weeklyHistory, existingData.weeklyHistory)
      : payload.weeklyHistory.slice(-14);

    const ownerUid = existingData?.ownerUid || user.uid;
    const linkedSet = new Set<string>(existingData?.linkedUids || [ownerUid]);
    linkedSet.add(user.uid);

    const roomDoc: CloudWellnessDocument = {
      syncCode: emailKey,
      ownerUid,
      linkedUids: Array.from(linkedSet).slice(0, 15),
      connectedDevices: mergeConnectedDevices(
        existingData?.connectedDevices,
        hwId
      ),
      updatedAt: Date.now(),
      lastDeviceName: getDefaultDeviceName(),
      dailyStats: mergedDaily,
      weeklyHistory: mergedHistory,
      standupSettings: existingData?.standupSettings
        ? mergeStandupSettings(payload.standupSettings, existingData.standupSettings)
        : payload.standupSettings,
      hydrationSettings: payload.hydrationSettings,
      voiceSettings: payload.voiceSettings,
    };
    await setDoc(targetDocRef, roomDoc);
  }

  public stopListening(): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
  }
}

export const firebaseSyncService = new FirebaseSyncService();
