import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDoc,
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

export interface FirebaseConfigPayload {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface CloudWellnessDocument {
  syncCode?: string;
  ownerUid?: string;
  linkedUids?: string[];
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

export function getDefaultDeviceName(): string {
  const saved = localStorage.getItem(DEVICE_NAME_STORAGE_KEY);
  if (saved) return saved;

  const ua = navigator.userAgent || '';
  let detected = 'DeskAura Device';
  if (/Macintosh|Mac OS X/i.test(ua)) {
    detected = 'MacBook / macOS';
  } else if (/Windows/i.test(ua)) {
    detected = 'Windows PC';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    detected = 'iPhone / iPad';
  }
  localStorage.setItem(DEVICE_NAME_STORAGE_KEY, detected);
  return detected;
}

export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_STORAGE_KEY, name.trim() || 'DeskAura Device');
}

export function generateAuraSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AURA-${suffix}`;
}

export function normalizeSyncCode(input: string): string {
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!clean) return '';
  if (clean.startsWith('AURA-')) return clean;
  if (clean.length === 6 && !clean.includes('-')) {
    return `AURA-${clean}`;
  }
  return clean;
}

/**
 * Deduplicated Union Merge for DailyWellnessStats across devices.
 * Prevents any device from overwriting water logs or standup counts made on another device!
 */
export function mergeDailyStats(
  local: DailyWellnessStats,
  remote: DailyWellnessStats
): DailyWellnessStats {
  // If remote is from an older date than local, keep local (today)
  if (remote.date < local.date) {
    return local;
  }
  // If remote is a newer date than local, adopt remote
  if (remote.date > local.date) {
    return remote;
  }

  // Same date (YYYY-MM-DD): Perform Deduplicated Log Union for waterLogs
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

/**
 * Parses a pasted Firebase snippet (either JSON or JS `const firebaseConfig = { ... }`)
 */
export function parseFirebaseConfigInput(rawInput: string): FirebaseConfigPayload | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.apiKey && parsed.projectId) {
      return {
        apiKey: String(parsed.apiKey),
        authDomain:
          String(parsed.authDomain || `${parsed.projectId}.firebaseapp.com`),
        projectId: String(parsed.projectId),
        storageBucket: String(parsed.storageBucket || ''),
        messagingSenderId: String(parsed.messagingSenderId || ''),
        appId: String(parsed.appId || ''),
      };
    }
  } catch {
    // Fallback regex extraction for JS object literal pasted from Firebase Console
  }

  const extractField = (key: string): string => {
    const regex = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`, 'i');
    const match = trimmed.match(regex);
    return match ? match[1].trim() : '';
  };

  const apiKey = extractField('apiKey');
  const projectId = extractField('projectId');
  const appId = extractField('appId');

  if (!apiKey || !projectId) {
    return null;
  }

  return {
    apiKey,
    authDomain: extractField('authDomain') || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: extractField('storageBucket') || `${projectId}.firebasestorage.app`,
    messagingSenderId: extractField('messagingSenderId'),
    appId: appId || '1:000000000000:web:deskaura',
  };
}

class FirebaseSyncService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;
  private unsubscribeAuth: (() => void) | null = null;
  private currentUser: User | null = null;

  public getSavedConfig(): FirebaseConfigPayload | null {
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
    return localStorage.getItem(SYNC_CODE_STORAGE_KEY) || '';
  }

  public saveSyncCode(code: string): void {
    const normalized = normalizeSyncCode(code);
    if (normalized) {
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
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          });
        } catch {
          // If already initialized, fallback
        }
      } else {
        this.app = getApps()[0];
      }

      this.auth = getAuth(this.app);
      if (!this.db && this.app) {
        this.db = initializeFirestore(this.app, {});
      }

      if (config) {
        this.saveConfig(config);
      }

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
      this.currentUser = user;
      callback(user);
    });

    return () => {
      if (this.unsubscribeAuth) {
        this.unsubscribeAuth();
        this.unsubscribeAuth = null;
      }
    };
  }

  public async ensureAuthenticated(): Promise<User> {
    if (!this.auth) {
      const res = this.init();
      if (!res.ok || !this.auth) {
        throw new Error(res.error || 'Firebase chưa được khởi tạo');
      }
    }
    if (this.auth.currentUser) {
      this.currentUser = this.auth.currentUser;
      return this.auth.currentUser;
    }
    const cred = await signInAnonymously(this.auth);
    this.currentUser = cred.user;
    return cred.user;
  }

  public async signInWithGoogle(): Promise<User> {
    if (!this.auth) {
      const res = this.init();
      if (!res.ok || !this.auth) {
        throw new Error(res.error || 'Firebase chưa được khởi tạo');
      }
    }
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    this.currentUser = cred.user;
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
    return cred.user;
  }

  public async logout(): Promise<void> {
    this.stopListening();
    if (this.auth) {
      await signOut(this.auth);
      this.currentUser = null;
    }
  }

  /**
   * Starts real-time listener on either `/sync_rooms/{syncCode}` (if paired via Aura Sync Code)
   * or `/users/{uid}` (if signed in via Google/Email without a custom room code).
   */
  public async startRealtimeSync(
    syncCode: string | null,
    initialLocalData: Omit<CloudWellnessDocument, 'updatedAt' | 'lastDeviceName'>,
    onRemoteData: (docData: CloudWellnessDocument) => void,
    onStatusChange: (status: SyncConnectionStatus, errorMsg?: string) => void
  ): Promise<void> {
    try {
      onStatusChange('connecting');
      const user = await this.ensureAuthenticated();
      if (!this.db) {
        throw new Error('Firestore chưa sẵn sàng');
      }

      this.stopListening();

      const normalizedCode = syncCode ? normalizeSyncCode(syncCode) : '';
      const targetDocRef = normalizedCode
        ? doc(this.db, 'sync_rooms', normalizedCode)
        : doc(this.db, 'users', user.uid);

      // Check if document exists on cloud; if not, seed it with local data
      const existingSnap = await getDoc(targetDocRef);
      if (!existingSnap.exists()) {
        const seedPayload: CloudWellnessDocument = {
          ...(normalizedCode
            ? {
                syncCode: normalizedCode,
                ownerUid: user.uid,
                linkedUids: [user.uid],
              }
            : {}),
          updatedAt: Date.now(),
          lastDeviceName: getDefaultDeviceName(),
          dailyStats: initialLocalData.dailyStats,
          weeklyHistory: initialLocalData.weeklyHistory.slice(-14),
          standupSettings: initialLocalData.standupSettings,
          hydrationSettings: initialLocalData.hydrationSettings,
          voiceSettings: initialLocalData.voiceSettings,
        };
        await setDoc(targetDocRef, seedPayload);
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
    syncCode: string | null,
    payload: Omit<CloudWellnessDocument, 'updatedAt' | 'lastDeviceName'>
  ): Promise<void> {
    if (!this.db) return;
    const user = this.currentUser || (await this.ensureAuthenticated());
    const normalizedCode = syncCode ? normalizeSyncCode(syncCode) : '';

    const targetDocRef = normalizedCode
      ? doc(this.db, 'sync_rooms', normalizedCode)
      : doc(this.db, 'users', user.uid);

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

    if (normalizedCode) {
      const ownerUid = existingData?.ownerUid || user.uid;
      const linkedSet = new Set<string>(existingData?.linkedUids || [ownerUid]);
      linkedSet.add(user.uid);
      const linkedUids = Array.from(linkedSet).slice(0, 15);

      const roomDoc: CloudWellnessDocument = {
        syncCode: normalizedCode,
        ownerUid,
        linkedUids,
        updatedAt: Date.now(),
        lastDeviceName: getDefaultDeviceName(),
        dailyStats: mergedDaily,
        weeklyHistory: mergedHistory,
        standupSettings: payload.standupSettings,
        hydrationSettings: payload.hydrationSettings,
        voiceSettings: payload.voiceSettings,
      };
      await setDoc(targetDocRef, roomDoc);
    } else {
      const userDoc: CloudWellnessDocument = {
        updatedAt: Date.now(),
        lastDeviceName: getDefaultDeviceName(),
        dailyStats: mergedDaily,
        weeklyHistory: mergedHistory,
        standupSettings: payload.standupSettings,
        hydrationSettings: payload.hydrationSettings,
        voiceSettings: payload.voiceSettings,
      };
      await setDoc(targetDocRef, userDoc);
    }
  }

  public stopListening(): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
  }
}

export const firebaseSyncService = new FirebaseSyncService();
