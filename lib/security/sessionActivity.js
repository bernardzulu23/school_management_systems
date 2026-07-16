/**
 * Server-side session idle activity (web cookie sessions).
 * Security boundary lives in proxy.js — this module provides the shared policy.
 */

import { ACCESS_TOKEN_MAX_AGE, authCookieOptions } from '@/lib/security/cookies'

export const SESSION_ACTIVITY_COOKIE = 'session_activity'
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000
export const IDLE_TIMEOUT_MESSAGE = 'Signed out due to inactivity'
export const IDLE_TIMEOUT_CODE = 'IDLE_TIMEOUT'

/** Paths that must not extend last-activity (still subject to idle rejection when cookie session). */
const PASSIVE_ACTIVITY_PREFIXES = [
  '/api/auth/me',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/platform/auth/me',
  '/api/csrf-token',
  '/api/ping',
  '/api/health',
  '/api/notifications/list',
  '/api/notifications/web-push',
]

/** Paths where idle is not checked (no session / machine / login entry). */
const IDLE_CHECK_EXEMPT_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/mobile/auth/login',
  '/api/mobile/auth/refresh',
  '/api/mobile/school/lookup',
  '/api/platform/auth/login',
  '/platform/login',
  '/login',
  '/register',
  '/api/public',
  '/api/onboarding',
  '/api/schools/check-subdomain',
  '/api/schools/register',
  '/api/schools/verify',
  '/api/payments/lipila/callback',
  '/api/onboarding/lipila/callback',
  '/api/sms/inbound',
  '/api/sms/delivery',
  '/api/sms/queue-worker',
  '/api/sms/broadcast-dispatcher',
  '/api/csp-report',
  '/api/marketplace',
  '/api/school/current',
  '/api/notifications/web-push/vapid-public-key',
]

function pathMatchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isPassiveActivityPath(pathname) {
  if (typeof pathname !== 'string') return true
  return PASSIVE_ACTIVITY_PREFIXES.some((p) => pathMatchesPrefix(pathname, p))
}

export function isIdleCheckExemptPath(pathname) {
  if (typeof pathname !== 'string') return true
  if (pathname === '/' || pathname === '/manifest.json' || pathname === '/sw.js') return true
  return IDLE_CHECK_EXEMPT_PREFIXES.some((p) => pathMatchesPrefix(pathname, p))
}

/**
 * Web cookie sessions only — Bearer (desktop/mobile) and /api/mobile/* are exempt.
 */
export function shouldEnforceCookieIdle(request, pathname) {
  if (isIdleCheckExemptPath(pathname)) return false
  if (typeof pathname === 'string' && pathname.startsWith('/api/mobile/')) return false
  const authHeader = String(request?.headers?.get?.('authorization') || '')
  if (authHeader.toLowerCase().startsWith('bearer ')) return false
  return Boolean(request?.cookies?.get?.('access_token')?.value)
}

function activitySecret() {
  return String(
    process.env.JWT_SECRET || process.env.JWT_REFRESH_SECRET || 'dev-idle-secret'
  ).trim()
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacHex(message) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(activitySecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return toHex(sig)
}

/** Signed cookie value: `${epochMs}.${hmacHex}` */
export async function signActivityTimestamp(now = Date.now()) {
  const ts = String(Math.floor(Number(now) || Date.now()))
  const sig = await hmacHex(ts)
  return `${ts}.${sig}`
}

export async function verifyActivityCookieValue(raw) {
  const value = String(raw || '')
  const dot = value.indexOf('.')
  if (dot <= 0) return null
  const ts = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  if (!/^\d+$/.test(ts) || !sig) return null
  const expected = await hmacHex(ts)
  if (sig.length !== expected.length) return null
  let ok = 0
  for (let i = 0; i < expected.length; i += 1) {
    ok |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  if (ok !== 0) return null
  const at = Number(ts)
  if (!Number.isFinite(at) || at <= 0) return null
  return at
}

export function getIdleMs(lastActivityAt, now = Date.now()) {
  const last = Number(lastActivityAt) || 0
  if (last <= 0) return Number.POSITIVE_INFINITY
  return Math.max(0, now - last)
}

export function isIdleTimedOut(lastActivityAt, now = Date.now(), limitMs = IDLE_TIMEOUT_MS) {
  const last = Number(lastActivityAt) || 0
  if (last <= 0) return true
  return now - last >= limitMs
}

export async function readActivityAt(request) {
  const raw = request?.cookies?.get?.(SESSION_ACTIVITY_COOKIE)?.value
  if (!raw) return null
  return verifyActivityCookieValue(raw)
}

export function activityCookieOptions(request) {
  return authCookieOptions(request, {
    maxAgeSeconds: ACCESS_TOKEN_MAX_AGE,
    name: SESSION_ACTIVITY_COOKIE,
  })
}

export async function stampActivityOnResponse(response, request, now = Date.now()) {
  if (!response?.cookies?.set) return response
  const value = await signActivityTimestamp(now)
  response.cookies.set(SESSION_ACTIVITY_COOKIE, value, activityCookieOptions(request))
  return response
}

export function clearActivityCookie(response, request) {
  if (!response?.cookies?.set) return response
  response.cookies.set(SESSION_ACTIVITY_COOKIE, '', {
    ...activityCookieOptions(request),
    maxAge: 0,
  })
  return response
}

export function idleTimeoutPayload() {
  return {
    success: false,
    code: IDLE_TIMEOUT_CODE,
    error: IDLE_TIMEOUT_MESSAGE,
    message: IDLE_TIMEOUT_MESSAGE,
  }
}
