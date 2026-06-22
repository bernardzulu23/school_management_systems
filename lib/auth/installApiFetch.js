/**
 * Patch window.fetch so same-origin /api/* calls include headers required by
 * anti-scraping (X-Requested-With, Accept) and CSRF on mutations.
 * Idempotent — safe to call from Providers on every mount.
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

export function installApiFetchPatch() {
  if (typeof window === 'undefined' || window.__zsmsFetchPatched) return
  window.__zsmsFetchPatched = true

  const nativeFetch = window.fetch.bind(window)

  window.fetch = function patchedFetch(input, init = {}) {
    const url = resolveRequestUrl(input)
    if (!isSameOriginApiUrl(url)) {
      return nativeFetch(input, init)
    }

    const method = String(init.method || 'GET').toUpperCase()
    const nextInit = withBrowserSessionFetchInit(init)
    const headers = new Headers(nextInit.headers)

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('x-csrf-token')) {
      const csrf = readCsrfTokenFromCookie()
      if (csrf) headers.set('x-csrf-token', csrf)
    }

    return nativeFetch(input, { ...nextInit, headers })
  }
}
