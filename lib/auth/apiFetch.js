/**
 * Browser-side fetch for /api/* with anti-scraping + CSRF headers.
 * Prefer sessionFetch when you need automatic refresh on 401/403.
 */
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { withBrowserSessionFetchInit } from '@/lib/security/browserSessionHeaders'

function readCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split('; ').find((row) => row.startsWith('csrf_token='))
  if (!match) return ''
  const raw = match.slice('csrf_token='.length)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function buildInit(input, init = {}) {
  const method = String(
    init.method || (input instanceof Request ? input.method : 'GET')
  ).toUpperCase()
  const nextInit = withBrowserSessionFetchInit({
    credentials: 'include',
    cache: 'no-store',
    ...init,
  })
  const headers = new Headers(nextInit.headers)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('x-csrf-token')) {
    const csrf = readCsrfTokenFromCookie()
    if (csrf) headers.set('x-csrf-token', csrf)
  }
  return { ...nextInit, headers }
}

/** GET/HEAD — headers only, no refresh retry. */
export function apiFetch(input, init = {}) {
  const built = buildInit(input, init)
  if (input instanceof Request) {
    return fetch(new Request(input, built))
  }
  return fetch(input, built)
}

/** Mutations and protected reads — refresh session once on 401/403. */
export function apiSessionFetch(input, init = {}) {
  return sessionFetch(input, buildInit(input, init))
}
