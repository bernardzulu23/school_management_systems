import crypto from 'crypto'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

function requestIsSecure(request) {
  if (process.env.NODE_ENV !== 'production') {
    const proto = request?.headers?.get?.('x-forwarded-proto')
    return proto === 'https'
  }
  return true
}

export function csrfCookieName() {
  return CSRF_COOKIE_NAME
}

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function csrfCookieOptions(request) {
  return {
    httpOnly: false,
    secure: requestIsSecure(request),
    sameSite: 'strict',
    path: '/',
    maxAge: 12 * 60 * 60, // 12h
  }
}

export function setCsrfCookie(response, request, token = generateCsrfToken()) {
  response.cookies.set(CSRF_COOKIE_NAME, token, csrfCookieOptions(request))
  return token
}

export function clearCsrfCookie(response, request) {
  response.cookies.set(CSRF_COOKIE_NAME, '', { ...csrfCookieOptions(request), maxAge: 0 })
}

/**
 * Double-submit cookie CSRF validation.
 * Accepts either same-origin request OR matching cookie/header token.
 */
export function verifyCsrfRequest(request) {
  const method = String(request?.method || 'GET').toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { ok: true }

  const url = new URL(request.url)
  const origin = String(request.headers.get('origin') || '').trim()
  const referer = String(request.headers.get('referer') || '').trim()

  // Same-origin guard covers same-site fetches that don't yet attach header token.
  if (origin && origin === url.origin) return { ok: true, mode: 'origin' }
  if (referer && referer.startsWith(url.origin)) return { ok: true, mode: 'referer' }

  const cookieToken = String(request.cookies?.get?.(CSRF_COOKIE_NAME)?.value || '').trim()
  const headerToken = String(request.headers.get(CSRF_HEADER_NAME) || '').trim()
  if (cookieToken && headerToken && cookieToken === headerToken) {
    return { ok: true, mode: 'token' }
  }

  return { ok: false, error: 'Invalid CSRF token' }
}
