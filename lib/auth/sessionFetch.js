/**
 * Cookie-session fetch with CSRF headers, deduplicated refresh, and one retry on 401/403.
 */

import { withBrowserSessionFetchInit } from '@/lib/security/browserSessionHeaders'

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
 * @returns {Promise<Headers>}
 */
async function buildSessionHeaders(init = {}) {
  const headers = new Headers(init.headers || {})
  const method = String(init.method || 'GET').toUpperCase()

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('x-csrf-token')) {
    const csrf = await getCsrfTokenForFetch()
    if (csrf) headers.set('x-csrf-token', csrf)
  }

  return headers
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
  const headers = await buildSessionHeaders(init)
  const opts = { credentials: 'include', ...init, headers }

  let res = await fetch(input, opts)
  if (res.status !== 401 && res.status !== 403) return res

  const refreshed = await refreshSession()
  if (!refreshed.ok) return res

  const retryHeaders = await buildSessionHeaders(init)
  return fetch(input, { credentials: 'include', ...init, headers: retryHeaders })
}

export function authErrorMessage(status, body) {
  if (status === 401 || status === 403) {
    const err = String(body?.error || body?.message || '').toLowerCase()
    if (err.includes('session expired') || err.includes('revoked')) {
      return 'Your session expired. Please log in again.'
    }
    if (err.includes('session') || err.includes('token') || err.includes('unauthorized')) {
      return 'Your session expired. Please log in again.'
    }
    if (err.includes('csrf')) {
      return 'Security token expired. Refresh the page and try again.'
    }
    return 'You are not authorized. Please log in again.'
  }
  return body?.message || body?.error || 'Request failed'
}

export function shouldRedirectToLogin(status, body) {
  if (status !== 401 && status !== 403) return false
  if (body?.stopRetry) return true
  const err = String(body?.error || body?.message || '').toLowerCase()
  return (
    err.includes('session') ||
    err.includes('token') ||
    err.includes('unauthorized') ||
    err.includes('revoked')
  )
}
