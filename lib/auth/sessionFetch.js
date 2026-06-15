/**
 * Cookie-session fetch with a single refresh retry on 401/403.
 */

export async function refreshSession() {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  return {
    ok: res.ok && json?.success,
    stopRetry: Boolean(json?.stopRetry),
    error: String(json?.error || ''),
    status: res.status,
  }
}

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 */
export async function sessionFetch(input, init = {}) {
  const opts = { credentials: 'include', ...init }
  let res = await fetch(input, opts)
  if (res.status !== 401 && res.status !== 403) return res

  const refreshed = await refreshSession()
  if (!refreshed.ok) return res

  return fetch(input, opts)
}

export function authErrorMessage(status, body) {
  if (status === 401 || status === 403) {
    const err = String(body?.error || body?.message || '').toLowerCase()
    if (err.includes('session') || err.includes('token') || err.includes('unauthorized')) {
      return 'Your session expired. Please log in again.'
    }
    return 'You are not authorized. Please log in again.'
  }
  return body?.message || body?.error || 'Request failed'
}
