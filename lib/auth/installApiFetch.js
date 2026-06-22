/**
 * Patch window.fetch so same-origin /api/* calls include headers required by
 * anti-scraping (X-Requested-With, Accept) and CSRF on mutations.
 * Call installApiFetchPatch() as early as possible on the client (module load).
 */
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

function resolveRequestUrl(input) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input && typeof input === 'object' && 'url' in input) return String(input.url || '')
  return ''
}

function isSameOriginApiUrl(url) {
  if (!url) return false
  if (url.startsWith('/api/')) return true
  if (typeof window !== 'undefined' && url.startsWith(`${window.location.origin}/api/`)) {
    return true
  }
  return false
}

function resolveMethod(input, init) {
  if (init?.method) return String(init.method).toUpperCase()
  if (input instanceof Request) return String(input.method || 'GET').toUpperCase()
  return 'GET'
}

function buildPatchedInit(input, init = {}) {
  const method = resolveMethod(input, init)
  const nextInit = withBrowserSessionFetchInit({
    credentials: 'include',
    ...init,
  })
  const headers = new Headers(nextInit.headers)

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('x-csrf-token')) {
    const csrf = readCsrfTokenFromCookie()
    if (csrf) headers.set('x-csrf-token', csrf)
  }

  return { ...nextInit, headers }
}

export function installApiFetchPatch() {
  if (typeof window === 'undefined' || window.__zsmsFetchPatched) return
  window.__zsmsFetchPatched = true

  const nativeFetch = window.fetch.bind(window)

  window.fetch = function patchedFetch(input, init = {}) {
    const url = resolveRequestUrl(input)
    if (!isSameOriginApiUrl(url)) {
      return nativeFetch(input, init)
    }

    const patchedInit = buildPatchedInit(input, init)
    if (input instanceof Request) {
      return nativeFetch(new Request(input, patchedInit))
    }
    return nativeFetch(input, patchedInit)
  }
}
