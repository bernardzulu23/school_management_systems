/**
 * HMAC ticket verification (mirrors lib/ai/chat/ws-ticket.ts in the Next.js app).
 * Format: base64url(JSON).base64url(HMAC-SHA256)
 */

export type TicketClaims = {
  sessionId: string
  userId: string
  connectionRole: 'user' | 'admin'
  exp: number
}

function b64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data)
  } else if (data instanceof Uint8Array) {
    bytes = data
  } else {
    bytes = new Uint8Array(data)
  }
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacSha256(secret: string, payload: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export async function verifyTicket(token: string, secret: string): Promise<TicketClaims | null> {
  const parts = String(token || '').split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  if (!payload || !sig) return null

  const expected = new Uint8Array(await hmacSha256(secret, payload))
  let actual: Uint8Array
  try {
    actual = b64urlDecode(sig)
  } catch {
    return null
  }
  if (!timingSafeEqual(expected, actual)) return null

  try {
    const json = new TextDecoder().decode(b64urlDecode(payload))
    const claims = JSON.parse(json) as TicketClaims
    if (!claims.sessionId || !claims.userId || !claims.connectionRole || !claims.exp) return null
    if (claims.connectionRole !== 'user' && claims.connectionRole !== 'admin') return null
    if (claims.exp < Math.floor(Date.now() / 1000)) return null
    return claims
  } catch {
    return null
  }
}

/** Exported for unit tests that run under Node (vitest). */
export function buildUnsignedPayload(claims: TicketClaims): string {
  return b64urlEncode(JSON.stringify(claims))
}

export async function signTicket(claims: TicketClaims, secret: string): Promise<string> {
  const payload = b64urlEncode(JSON.stringify(claims))
  const sig = await hmacSha256(secret, payload)
  return `${payload}.${b64urlEncode(sig)}`
}
