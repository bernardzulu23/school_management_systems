/**
 * Consistent auth cookie options (httpOnly, secure, sameSite).
 */

function requestIsSecure(request) {
  if (process.env.NODE_ENV !== 'production') {
    const proto = request?.headers?.get?.('x-forwarded-proto')
    return proto === 'https'
  }
  return true
}

export function resolveCookieDomain(request) {
  const configured = process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN).trim() : ''
  if (!configured) return undefined

  const host = String(request?.headers?.get?.('host') || '')
    .split(':')[0]
    .toLowerCase()
  if (!host || host === 'localhost' || /^[0-9.]+$/.test(host)) return undefined

  const normalized = configured.startsWith('.') ? configured.slice(1) : configured
  if (!host.endsWith(normalized)) return undefined
  return configured.startsWith('.') ? configured : `.${configured}`
}

/**
 * @param {import('next/server').NextRequest | Request} request
 * @param {{ maxAgeSeconds: number, name?: string }} opts
 */
export function authCookieOptions(request, { maxAgeSeconds, name = 'access_token' }) {
  const secure = requestIsSecure(request)
  const domain = resolveCookieDomain(request)

  const base = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: maxAgeSeconds,
    path: '/',
  }

  if (domain) {
    return { ...base, domain }
  }

  // __Host- prefix requires secure, path=/, no Domain (stricter in production without COOKIE_DOMAIN)
  if (secure && process.env.NODE_ENV === 'production' && name.startsWith('__Host-')) {
    return base
  }

  return base
}

export const ACCESS_TOKEN_MAX_AGE = 8 * 60 * 60
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60
export const REMEMBER_ACCESS_TOKEN_MAX_AGE = 30 * 24 * 60 * 60
export const REMEMBER_REFRESH_TOKEN_MAX_AGE = 90 * 24 * 60 * 60

/** Clear session cookies after onboarding or tenant-sensitive account changes. */
export function clearAuthSessionCookies(response, request) {
  for (const name of ['access_token', 'refresh_token', 'session-token', 'session']) {
    response.cookies.set(name, '', authCookieOptions(request, { maxAgeSeconds: 0, name }))
  }
}
