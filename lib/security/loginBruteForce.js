/**
 * Account-level login brute-force protection (complements IP rate limits).
 * Tracks failed password attempts per school + email + IP.
 */
import { LRUCache } from 'lru-cache'
import { NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/headers'

const store = new LRUCache({
  max: 8000,
  ttl: 60 * 60 * 1000,
})

const isProd = process.env.NODE_ENV === 'production'

export const LOGIN_BRUTE_FORCE = {
  maxAttempts: isProd ? 5 : 12,
  lockoutMs: 15 * 60 * 1000,
  windowMs: 15 * 60 * 1000,
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

export function loginBruteForceKey({ email, schoolId = 'global', ip = '' }) {
  return `${String(schoolId || 'global')}:${normalizeEmail(email)}:${String(ip || 'unknown')}`
}

function getEntry(key) {
  const raw = store.get(key)
  if (!raw || typeof raw !== 'object') return null
  const now = Date.now()
  if (raw.windowExpiresAt && now >= raw.windowExpiresAt) {
    store.delete(key)
    return null
  }
  return raw
}

/**
 * @returns {{ blocked: false } | { blocked: true, response: import('next/server').NextResponse, retryAfter: number }}
 */
export function checkLoginBruteForce({ request, email, schoolId, ip }) {
  const key = loginBruteForceKey({ email, schoolId, ip })
  const entry = getEntry(key)
  if (!entry?.lockedUntil || Date.now() >= entry.lockedUntil) {
    return { blocked: false }
  }

  const retryAfter = Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 1000))
  const response = NextResponse.json(
    {
      error: 'Too many failed login attempts',
      message: `Account temporarily locked. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
      retryAfter,
      code: 'LOGIN_LOCKED',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store',
      },
    }
  )
  applySecurityHeaders(response, request, { cors: false })
  return { blocked: true, response, retryAfter }
}

export function recordLoginFailure({ email, schoolId, ip }) {
  const key = loginBruteForceKey({ email, schoolId, ip })
  const now = Date.now()
  const prev = getEntry(key)
  const attempts = (prev?.attempts || 0) + 1
  const windowExpiresAt = prev?.windowExpiresAt || now + LOGIN_BRUTE_FORCE.windowMs

  const next = {
    attempts,
    windowExpiresAt,
    lockedUntil:
      attempts >= LOGIN_BRUTE_FORCE.maxAttempts
        ? now + LOGIN_BRUTE_FORCE.lockoutMs
        : prev?.lockedUntil || null,
  }

  store.set(key, next, { ttl: LOGIN_BRUTE_FORCE.lockoutMs + LOGIN_BRUTE_FORCE.windowMs })
  return {
    attempts,
    locked: Boolean(next.lockedUntil && now < next.lockedUntil),
    remainingAttempts: Math.max(0, LOGIN_BRUTE_FORCE.maxAttempts - attempts),
  }
}

export function clearLoginFailures({ email, schoolId, ip }) {
  store.delete(loginBruteForceKey({ email, schoolId, ip }))
}

/** Record a failed attempt; return lock response when threshold is reached. */
export function handleLoginFailure({ request, email, schoolId, ip }) {
  recordLoginFailure({ email, schoolId, ip })
  return checkLoginBruteForce({ request, email, schoolId, ip })
}

/** @internal Test helper */
export function resetLoginBruteForceForTests() {
  store.clear()
}

export function getRequestIp(request) {
  const directIp = String(request?.ip || '').trim()
  if (directIp) return directIp
  const cf = String(request.headers.get('cf-connecting-ip') || '').trim()
  if (cf) return cf
  const xff = String(request.headers.get('x-forwarded-for') || '').trim()
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
