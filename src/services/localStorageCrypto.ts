/**
 * Hardware-Bound Local Storage Encryption (enc:v2: RAM-Only Key + Zero-Data-Loss Migration from enc:v1: & Plaintext)
 * Protects local health history, hydration logs, and user settings on disk without storing raw vault seeds in localStorage.
 */

const VAULT_PREFIX_V2 = 'enc:v2:';
const VAULT_PREFIX_V1 = 'enc:v1:';
const LEGACY_VAULT_HW_SEED_KEY = 'deskaura_hw_vault_seed_v1';
const APP_SECRET_SALT = 'DeskAura::HealthVault::v1.2.3::CalmTechSalt#9981';
const APP_SECRET_SALT_V2 = 'DeskAura::HealthVault::v1.2.5::RamOnlyVault#7749';
const LAN_ROOM_SALT = 'DeskAura::LanRoomSalt::v1.2.5';

// Strictly held in RAM closure — never persisted in plaintext to localStorage
let inMemoryVaultSeedV2: string | null = null;
let legacyV1SeedCache: string | null = null;
const lastPlaintextCache = new Map<string, string>();

function fnv1a32(input: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function fnv1a32Bytes(bytes: Uint8Array, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Anonymizes raw email or sync code into a 128-bit one-way room token (`rk2_<32hex>`).
 * Matches `lan_sync::anonymize_room_key` in Rust byte-for-byte.
 */
export function hashLanRoomKey(raw: string): string {
  const clean = (raw || '').trim().toLowerCase();
  if (!clean) return '';
  if (clean.startsWith('rk2_') && clean.length === 36) {
    return clean;
  }
  const encoder = new TextEncoder();
  const h1 = fnv1a32Bytes(encoder.encode(`${clean}|${LAN_ROOM_SALT}|1`), 0x811c9dc5)
    .toString(16)
    .padStart(8, '0');
  const h2 = fnv1a32Bytes(encoder.encode(`${clean}|${LAN_ROOM_SALT}|2`), 0x9e3779b9)
    .toString(16)
    .padStart(8, '0');
  const h3 = fnv1a32Bytes(encoder.encode(`${clean}|${LAN_ROOM_SALT}|3`), 0x85ebca6b)
    .toString(16)
    .padStart(8, '0');
  const h4 = fnv1a32Bytes(encoder.encode(`${clean}|${LAN_ROOM_SALT}|4`), 0xc2b2ae35)
    .toString(16)
    .padStart(8, '0');
  return `rk2_${h1}${h2}${h3}${h4}`;
}

function deriveV1Seed(hardwareId: string): string {
  const clean = hardwareId.trim().toLowerCase();
  const s1 = fnv1a32(`${clean}|${APP_SECRET_SALT}|1`).toString(16).padStart(8, '0');
  const s2 = fnv1a32(`${clean}|${APP_SECRET_SALT}|2`).toString(16).padStart(8, '0');
  const s3 = fnv1a32(`${clean}|${APP_SECRET_SALT}|3`).toString(16).padStart(8, '0');
  const s4 = fnv1a32(`${clean}|${APP_SECRET_SALT}|4`).toString(16).padStart(8, '0');
  return `${s1}${s2}${s3}${s4}`;
}

function deriveStretchedV2Seed(hardwareId: string): string {
  const clean = hardwareId.trim().toLowerCase();
  let state = `${clean}|${APP_SECRET_SALT_V2}`;
  for (let round = 0; round < 32; round++) {
    const a = fnv1a32(`${state}|r${round}|a`, 0x811c9dc5 ^ round).toString(16).padStart(8, '0');
    const b = fnv1a32(`${state}|r${round}|b`, 0x9e3779b9 ^ round).toString(16).padStart(8, '0');
    const c = fnv1a32(`${state}|r${round}|c`, 0x85ebca6b ^ round).toString(16).padStart(8, '0');
    const d = fnv1a32(`${state}|r${round}|d`, 0xc2b2ae35 ^ round).toString(16).padStart(8, '0');
    state = `${a}${b}${c}${d}`;
  }
  return state;
}

export function bindHardwareIdToVault(hardwareId: string): void {
  if (!hardwareId) return;
  try {
    // Capture any legacy v1 seed in RAM before purging it from localStorage
    const existingLegacy = localStorage.getItem(LEGACY_VAULT_HW_SEED_KEY);
    if (existingLegacy && !legacyV1SeedCache) {
      legacyV1SeedCache = existingLegacy;
    }
    if (!legacyV1SeedCache) {
      legacyV1SeedCache = deriveV1Seed(hardwareId);
    }
    inMemoryVaultSeedV2 = deriveStretchedV2Seed(hardwareId);
    // Remove plaintext seed key from localStorage if present
    if (existingLegacy) {
      localStorage.removeItem(LEGACY_VAULT_HW_SEED_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function getVaultSeedV2(): string {
  if (inMemoryVaultSeedV2) {
    return inMemoryVaultSeedV2;
  }
  try {
    const fallbackHw =
      localStorage.getItem('mamxanh_device_id_v1') ||
      navigator.userAgent ||
      'deskaura-default-machine';
    bindHardwareIdToVault(fallbackHw);
    return inMemoryVaultSeedV2 || deriveStretchedV2Seed('deskaura-default-machine');
  } catch {
    return deriveStretchedV2Seed('deskaura-default-machine');
  }
}

function getLegacyV1Seed(): string {
  if (legacyV1SeedCache) return legacyV1SeedCache;
  try {
    const existing = localStorage.getItem(LEGACY_VAULT_HW_SEED_KEY);
    if (existing && existing.length >= 16) {
      legacyV1SeedCache = existing;
      return existing;
    }
    const fallbackHw =
      localStorage.getItem('mamxanh_device_id_v1') ||
      navigator.userAgent ||
      'deskaura-default-machine';
    legacyV1SeedCache = deriveV1Seed(fallbackHw);
    return legacyV1SeedCache;
  } catch {
    return 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  }
}

function generateKeystreamByte(seed: string, nonce: string, index: number): number {
  const block = Math.floor(index / 4);
  const offset = index % 4;
  const word = fnv1a32(`${seed}:${nonce}:${block}`, 0x811c9dc5 ^ Math.imul(block, 0x9e3779b9));
  return (word >>> (offset * 8)) & 0xff;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function computeMac64(seed: string, nonce: string, b64: string): string {
  const m1 = fnv1a32(`${seed}:${nonce}:${b64}:mac1`, 0x811c9dc5).toString(16).padStart(8, '0');
  const m2 = fnv1a32(`${seed}:${nonce}:${b64}:mac2`, 0x9e3779b9).toString(16).padStart(8, '0');
  return `${m1}${m2}`;
}

export function encryptString(plaintext: string): string {
  const seed = getVaultSeedV2();
  const nonceArr = new Uint32Array(2);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(nonceArr);
  } else {
    nonceArr[0] = (Math.random() * 0xffffffff) >>> 0;
    nonceArr[1] = Date.now() >>> 0;
  }
  const nonce =
    nonceArr[0].toString(16).padStart(8, '0') +
    nonceArr[1].toString(16).padStart(8, '0');

  const encoder = new TextEncoder();
  const plainBytes = encoder.encode(plaintext);
  const cipherBytes = new Uint8Array(plainBytes.length);

  for (let i = 0; i < plainBytes.length; i++) {
    cipherBytes[i] = plainBytes[i] ^ generateKeystreamByte(seed, nonce, i);
  }

  const b64 = bytesToBase64(cipherBytes);
  const mac = computeMac64(seed, nonce, b64);
  return `${VAULT_PREFIX_V2}${nonce}:${mac}:${b64}`;
}

export function decryptString(payload: string): string | null {
  if (payload.startsWith(VAULT_PREFIX_V2)) {
    const body = payload.slice(VAULT_PREFIX_V2.length);
    const parts = body.split(':');
    if (parts.length !== 3) return null;

    const [nonce, mac, b64] = parts;
    const seed = getVaultSeedV2();
    const expectedMac = computeMac64(seed, nonce, b64);
    if (mac !== expectedMac) {
      return null;
    }

    try {
      const cipherBytes = base64ToBytes(b64);
      const plainBytes = new Uint8Array(cipherBytes.length);
      for (let i = 0; i < cipherBytes.length; i++) {
        plainBytes[i] = cipherBytes[i] ^ generateKeystreamByte(seed, nonce, i);
      }
      return new TextDecoder().decode(plainBytes);
    } catch {
      return null;
    }
  }

  if (payload.startsWith(VAULT_PREFIX_V1)) {
    const body = payload.slice(VAULT_PREFIX_V1.length);
    const parts = body.split(':');
    if (parts.length !== 3) return null;

    const [nonce, mac, b64] = parts;
    const seed = getLegacyV1Seed();
    const expectedMac = fnv1a32(`${seed}:${nonce}:${b64}`).toString(16).padStart(8, '0');
    if (mac !== expectedMac) {
      return null;
    }

    try {
      const cipherBytes = base64ToBytes(b64);
      const plainBytes = new Uint8Array(cipherBytes.length);
      for (let i = 0; i < cipherBytes.length; i++) {
        plainBytes[i] = cipherBytes[i] ^ generateKeystreamByte(seed, nonce, i);
      }
      return new TextDecoder().decode(plainBytes);
    } catch {
      return null;
    }
  }

  return payload;
}

export function readEncryptedJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    if (raw.startsWith(VAULT_PREFIX_V2)) {
      const decrypted = decryptString(raw);
      if (!decrypted) return fallback;
      lastPlaintextCache.set(key, decrypted);
      return JSON.parse(decrypted) as T;
    }

    if (raw.startsWith(VAULT_PREFIX_V1)) {
      // Zero-Data-Loss Migration from enc:v1: -> enc:v2: (RAM-only key)
      const decrypted = decryptString(raw);
      if (!decrypted) return fallback;
      const parsed = JSON.parse(decrypted) as T;
      writeEncryptedJson(key, parsed);
      return parsed;
    }

    // Automatic Zero-Data-Loss Migration from legacy plaintext JSON (v1.2.1 and older)
    const parsed = JSON.parse(raw) as T;
    writeEncryptedJson(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeEncryptedJson<T>(key: string, value: T): void {
  try {
    const json = JSON.stringify(value);
    if (lastPlaintextCache.get(key) === json) {
      // Skip redundant encryption & disk I/O when serialized payload is unchanged
      return;
    }
    lastPlaintextCache.set(key, json);
    const encrypted = encryptString(json);
    localStorage.setItem(key, encrypted);
  } catch {
    // ignore quota or private browsing errors
  }
}
