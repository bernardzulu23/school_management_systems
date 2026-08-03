/**
 * AES-GCM + PBKDF2 seed crypto — mirrors lib/offline/seed-crypto.js (Web Crypto).
 */
import { SEED_FORMAT, SEED_PASSPHRASE_MIN } from '@/offline/syncContracts'

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('Web Crypto not available')
  return subtle
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return globalThis.btoa(s)
}

function getRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  globalThis.crypto.getRandomValues(buf)
  return buf
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle()
  const enc = new TextEncoder()
  const baseKey = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 120000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export type SeedEnvelope = {
  format: string
  version?: number
  schoolId?: string
  userId?: string
  role?: string
  exportedAt?: string
  expiresAt?: string
  cipher?: { algo?: string; iv?: string; salt?: string; iterations?: number }
  ciphertext?: string
}

export async function decryptSeedPayload(
  envelope: SeedEnvelope,
  passphrase: string
): Promise<Record<string, unknown>> {
  if (!envelope || envelope.format !== SEED_FORMAT) {
    throw new Error('Not a valid .zsmsseed file')
  }
  if (!passphrase || passphrase.length < SEED_PASSPHRASE_MIN) {
    throw new Error(`Passphrase must be at least ${SEED_PASSPHRASE_MIN} characters`)
  }
  const salt = base64ToBytes(envelope.cipher?.salt || '')
  const iv = base64ToBytes(envelope.cipher?.iv || '')
  const key = await deriveKey(String(passphrase), salt)
  const plain = await getSubtle().decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    base64ToBytes(envelope.ciphertext || '')
  )
  const text = new TextDecoder().decode(plain)
  return JSON.parse(text) as Record<string, unknown>
}

export async function encryptSeedPayload(
  payload: Record<string, unknown>,
  passphrase: string
): Promise<SeedEnvelope> {
  if (!passphrase || passphrase.length < SEED_PASSPHRASE_MIN) {
    throw new Error(`Passphrase must be at least ${SEED_PASSPHRASE_MIN} characters`)
  }
  const salt = getRandomBytes(16)
  const iv = getRandomBytes(12)
  const key = await deriveKey(String(passphrase), salt)
  const enc = new TextEncoder()
  const ciphertext = await getSubtle().encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    enc.encode(JSON.stringify(payload))
  )
  return {
    format: SEED_FORMAT,
    version: 1,
    schoolId: String(payload.schoolId || ''),
    userId: String(payload.userId || ''),
    role: String(payload.role || ''),
    exportedAt: String(payload.exportedAt || ''),
    expiresAt: String(payload.expiresAt || ''),
    cipher: {
      algo: 'AES-GCM',
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      iterations: 120000,
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }
}
