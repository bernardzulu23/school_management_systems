/**
 * AES-256-GCM helpers for SMS gateway pairing tokens.
 * Raw tokens must never be logged or stored plaintext in the database.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const hex = String(process.env.SMS_GATEWAY_ENCRYPTION_KEY || '').trim()
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'SMS_GATEWAY_ENCRYPTION_KEY must be a 64-char hex string (openssl rand -hex 32)'
    )
  }
  return Buffer.from(hex, 'hex')
}

/** Encrypt plaintext → `iv:tag:ciphertext` (all hex). */
export function encrypt(text: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/** Decrypt `iv:tag:ciphertext` hex payload. Never log the result. */
export function decrypt(payload: string): string {
  const parts = String(payload || '').split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted payload')
  const [ivHex, tagHex, dataHex] = parts
  if (ivHex.length !== IV_LEN * 2 || tagHex.length !== TAG_LEN * 2) {
    throw new Error('Invalid encrypted payload lengths')
  }
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}

/** SHA-256 hex digest for deviceToken lookup (no plaintext in DB). */
export function hashDeviceToken(rawToken: string): string {
  return createHash('sha256').update(String(rawToken), 'utf8').digest('hex')
}
