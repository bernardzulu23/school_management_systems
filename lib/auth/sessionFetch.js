/**
 * Cookie-session fetch with CSRF headers, deduplicated refresh, and one retry on 401/403.
 */

import { withBrowserSessionFetchInit } from '@/lib/security/browserSessionHeaders'
import { userFacingFromHttp, ERROR_MESSAGES } from '@/lib/utils/errorMessages'

/** @type {Promise<{ ok: boolean, stopRetry: boolean, error: string, status: number }> | null} */
let refreshInFlight = null

async function readCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split('; ').find((row) => row.startsWith('csrf_token='))
  if (!match) return ''
  const value = match.slice('csrf_token='.length)
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function getCsrfTokenForFetch() {
  const fromCookie = await readCsrfTokenFromCookie()
  if (fromCookie) return fromCookie

  try {
    const res = await fetch('/api/csrf-token', { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return ''
    const headerToken = res.headers.get('X-CSRF-Token')
    if (headerToken) return String(headerToken).trim()
    const json = await res.json().catch(() => ({}))
    return String(json?.token || '').trim()
  } catch {
    return ''
  }
}

/**
 * @param {RequestInit} [init]
 * @returns {Promise<RequestInit>}
 */
async function buildSessionInit(init = {}) {
  const headers = new Headers(withBrowserSessionFetchInit(init).headers)
  const method = String(init.method || 'GET').toUpperCase()

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('x-csrf-token')) {
    const csrf = await getCsrfTokenForFetch()
    if (csrf) headers.set('x-csrf-token', csrf)
  }

  return withBrowserSessionFetchInit({
    credentials: 'include',
    ...init,
    headers,
  })
}

export async function refreshSession() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const res = await fetch(
        '/api/auth/refresh',
        withBrowserSessionFetchInit({
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        })
      )
      const json = await res.json().catch(() => ({}))
      return {
        ok: res.ok && json?.success,
        stopRetry: Boolean(json?.stopRetry),
        error: String(json?.error || ''),
        status: res.status,
      }
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 */
export async function sessionFetch(input, init = {}) {
  let res = await fetch(input, await buildSessionInit(init))
  if (res.status !== 401 && res.status !== 403) return res

  const body = await res
    .clone()
    .json()
    .catch(() => ({}))
  if (String(body?.code || '').toUpperCase() === 'IDLE_TIMEOUT') {
    if (typeof window !== 'undefined') {
      const { useAuth } = await import('@/lib/auth')
      await useAuth.getState().logout?.({ redirectTo: '/login?reason=idle' })
    }
    return res
  }

  const refreshed = await refreshSession()
  if (!refreshed.ok) return res

  return fetch(input, await buildSessionInit(init))
}

export function authErrorMessage(status, body) {
  return userFacingFromHttp(status, body, ERROR_MESSAGES.GENERIC)
}

export function shouldRedirectToLogin(status, body) {
  if (status !== 401 && status !== 403) return false
  if (String(body?.code || '').toUpperCase() === 'IDLE_TIMEOUT') return true
  if (body?.stopRetry) return true
  const err = String(body?.error || body?.message || '').toLowerCase()
  return (
    err.includes('session') ||
    err.includes('token') ||
    err.includes('unauthorized') ||
    err.includes('revoked') ||
    err.includes('inactivity')
  )
}
