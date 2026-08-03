/**
 * Encrypt / decrypt offline seed packs (.zsmsseed) with AES-GCM + PBKDF2.
 * Works in browser (Web Crypto) and Node (crypto.webcrypto).
 */

function getSubtle() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle
  }
  throw new Error('Web Crypto not available')
}

function getRandomBytes(n) {
  const buf = new Uint8Array(n)
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(buf)
    return buf
  }
  throw new Error('crypto.getRandomValues not available')
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let s = ''
  bytes.forEach((b) => {
    s += String.fromCharCode(b)
  })
  return btoa(s)
}

function base64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'))
  }
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(passphrase, salt) {
  const subtle = getSubtle()
  const enc = new TextEncoder()
  const baseKey = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * @param {object} payload — plaintext seed body
 * @param {string} passphrase
 */
export async function encryptSeedPayload(payload, passphrase) {
  if (!passphrase || String(passphrase).length < 6) {
    throw new Error('Passphrase must be at least 6 characters')
  }
  const salt = getRandomBytes(16)
  const iv = getRandomBytes(12)
  const key = await deriveKey(String(passphrase), salt)
  const enc = new TextEncoder()
  const ciphertext = await getSubtle().encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(payload))
  )
  return {
    format: 'zsmsseed',
    version: 1,
    schoolId: payload.schoolId,
    userId: payload.userId,
    role: payload.role,
    exportedAt: payload.exportedAt,
    expiresAt: payload.expiresAt,
    cipher: {
      algo: 'AES-GCM',
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      iterations: 120000,
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

/**
 * @param {object} envelope — .zsmsseed JSON
 * @param {string} passphrase
 */
export async function decryptSeedPayload(envelope, passphrase) {
  if (!envelope || envelope.format !== 'zsmsseed') {
    throw new Error('Not a valid .zsmsseed file')
  }
  if (!passphrase) throw new Error('Passphrase required')
  const salt = base64ToBytes(envelope.cipher?.salt || '')
  const iv = base64ToBytes(envelope.cipher?.iv || '')
  const key = await deriveKey(String(passphrase), salt)
  const plain = await getSubtle().decrypt(
    { name: 'AES-GCM', iv },
    key,
    base64ToBytes(envelope.ciphertext || '')
  )
  const text = new TextDecoder().decode(plain)
  return JSON.parse(text)
}
