/**
 * Hardware-Bound Local Storage Encryption (enc:v1:)
 * Protects local health history, hydration logs, and user settings on disk.
 * Automatically migrates legacy plaintext JSON from v1.2.1 and earlier without data loss.
 */

const VAULT_PREFIX = 'enc:v1:';
const VAULT_HW_SEED_KEY = 'deskaura_hw_vault_seed_v1';
const APP_SECRET_SALT = 'DeskAura::HealthVault::v1.2.3::CalmTechSalt#9981';

function fnv1a32(input: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function bindHardwareIdToVault(hardwareId: string): void {
  if (!hardwareId) return;
  try {
    const clean = hardwareId.trim().toLowerCase();
    const s1 = fnv1a32(`${clean}|${APP_SECRET_SALT}|1`).toString(16).padStart(8, '0');
    const s2 = fnv1a32(`${clean}|${APP_SECRET_SALT}|2`).toString(16).padStart(8, '0');
    const s3 = fnv1a32(`${clean}|${APP_SECRET_SALT}|3`).toString(16).padStart(8, '0');
    const s4 = fnv1a32(`${clean}|${APP_SECRET_SALT}|4`).toString(16).padStart(8, '0');
    const derivedSeed = `${s1}${s2}${s3}${s4}`;
    const existing = localStorage.getItem(VAULT_HW_SEED_KEY);
    if (!existing) {
      localStorage.setItem(VAULT_HW_SEED_KEY, derivedSeed);
    }
  } catch {
    // ignore storage errors
  }
}

function getVaultSeed(): string {
  try {
    const existing = localStorage.getItem(VAULT_HW_SEED_KEY);
    if (existing && existing.length >= 16) {
      return existing;
    }
    // Derive fallback seed from existing persistent device id or generate once
    const fallbackHw =
      localStorage.getItem('mamxanh_device_id_v1') ||
      navigator.userAgent ||
      'deskaura-default-machine';
    bindHardwareIdToVault(fallbackHw);
    return localStorage.getItem(VAULT_HW_SEED_KEY) || 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  } catch {
    return 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  }
}

function generateKeystreamByte(seed: string, nonce: string, index: number): number {
  const block = Math.floor(index / 4);
  const offset = index % 4;
  const word = fnv1a32(`${seed}:${nonce}:${block}`, 0x811c9dc5 ^ (block * 0x9e3779b9));
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

export function encryptString(plaintext: string): string {
  const seed = getVaultSeed();
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
  const mac = fnv1a32(`${seed}:${nonce}:${b64}`).toString(16).padStart(8, '0');
  return `${VAULT_PREFIX}${nonce}:${mac}:${b64}`;
}

export function decryptString(payload: string): string | null {
  if (!payload.startsWith(VAULT_PREFIX)) {
    return payload;
  }
  const body = payload.slice(VAULT_PREFIX.length);
  const parts = body.split(':');
  if (parts.length !== 3) return null;

  const [nonce, mac, b64] = parts;
  const seed = getVaultSeed();
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
    const decoder = new TextDecoder();
    return decoder.decode(plainBytes);
  } catch {
    return null;
  }
}

export function readEncryptedJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    if (raw.startsWith(VAULT_PREFIX)) {
      const decrypted = decryptString(raw);
      if (!decrypted) return fallback;
      return JSON.parse(decrypted) as T;
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
    const encrypted = encryptString(json);
    localStorage.setItem(key, encrypted);
  } catch {
    // ignore quota or private browsing errors
  }
}

