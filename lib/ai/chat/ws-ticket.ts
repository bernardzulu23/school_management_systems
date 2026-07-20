/**
 * Short-lived HMAC tickets for Cloudflare Durable Object WebSocket auth.
 * Next.js issues tickets after server-side auth; the DO verifies the signature
 * and never trusts a client-supplied role alone.
 */
import { createHmac, timingSafeEqual } from 'crypto'

export type ChatWsTicketClaims = {
  sessionId: string
  userId: string
  /** Server-issued connection role — DO must re-check against claim state for admin */
  connectionRole: 'user' | 'admin'
  exp: number
}

function ticketSecret(): string {
  return (
    String(process.env.CHAT_DO_SHARED_SECRET || '').trim() ||
    String(process.env.JWT_SECRET || '').trim() ||
    'dev-chat-do-secret'
  )
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64url')
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url')
}

export function signChatWsTicket(
  claims: Omit<ChatWsTicketClaims, 'exp'> & { expSec?: number }
): string {
  const exp = Math.floor(Date.now() / 1000) + (claims.expSec ?? 300)
  const body: ChatWsTicketClaims = {
    sessionId: claims.sessionId,
    userId: claims.userId,
    connectionRole: claims.connectionRole,
    exp,
  }
  const payload = b64url(JSON.stringify(body))
  const sig = createHmac('sha256', ticketSecret()).update(payload).digest()
  return `${payload}.${b64url(sig)}`
}

export function verifyChatWsTicket(token: string): ChatWsTicketClaims | null {
  const parts = String(token || '').split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  if (!payload || !sig) return null
  const expected = createHmac('sha256', ticketSecret()).update(payload).digest()
  let actual: Buffer
  try {
    actual = fromB64url(sig)
  } catch {
    return null
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  try {
    const claims = JSON.parse(fromB64url(payload).toString('utf8')) as ChatWsTicketClaims
    if (!claims.sessionId || !claims.userId || !claims.connectionRole || !claims.exp) return null
    if (claims.connectionRole !== 'user' && claims.connectionRole !== 'admin') return null
    if (claims.exp < Math.floor(Date.now() / 1000)) return null
    return claims
  } catch {
    return null
  }
}

export function chatDoWssBaseUrl(): string | null {
  const url = String(
    process.env.NEXT_PUBLIC_CHAT_DO_WSS_URL || process.env.CHAT_DO_WSS_URL || ''
  ).trim()
  return url || null
}

export function chatDoHttpBaseUrl(): string | null {
  const wss = chatDoWssBaseUrl()
  if (!wss) return null
  if (wss.startsWith('wss://')) return `https://${wss.slice(6).replace(/\/$/, '')}`
  if (wss.startsWith('ws://')) return `http://${wss.slice(5).replace(/\/$/, '')}`
  if (wss.startsWith('https://') || wss.startsWith('http://')) return wss.replace(/\/$/, '')
  return null
}
