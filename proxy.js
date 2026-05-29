import { NextResponse } from 'next/server'
import * as jose from 'jose'
import {
  applySecurityHeaders,
  BLOCKED_HTTP_METHODS,
  getCorsHeaders,
  isForbiddenCrossOrigin,
  stripInternalRequestHeaders,
} from './lib/security/headers'
import { checkProxyRateLimit } from './lib/security/proxyRateLimit'
import { verifyCsrfRequest } from './lib/security/csrf'

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/mobile/auth/login',
  '/api/mobile/auth/refresh',
  '/api/mobile/school/lookup',
  '/api/platform/auth/login',
  '/platform/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/me',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/csrf-token',
  '/api/sms/inbound',
  '/api/sms/delivery',
  '/api/public',
  '/api/public/features',
  '/api/public/platform-stats',
  // Marketplace browsing is public (browse before signup). The mutating
  // sub-routes (submit/review/rate/download/mine) enforce auth internally.
  '/api/marketplace',
  '/api/onboarding',
  '/api/schools/check-subdomain',
  '/api/schools/register',
  '/api/schools/verify',
  '/api/payments/lipila/callback',
  '/api/onboarding/lipila/callback',
  '/api/school/current',
  '/api/health',
  '/api/ping',
  '/login',
  '/register',
  '/manifest.json',
  '/sw.js',
  '/',
]

const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/onboarding',
  '/api/payments/lipila/callback',
  '/api/onboarding/lipila/callback',
  '/api/sms/inbound',
  '/api/sms/delivery',
  '/api/health',
  '/api/ping',
]

function secureResponse(body, init, request) {
  const response = body === null ? new NextResponse(null, init) : NextResponse.json(body, init)
  return applySecurityHeaders(response, request)
}

/** Next.js 16 proxy — multi-tenant subdomain routing and API security. */
export async function handleSecurityProxy(request) {
  try {
    const { pathname } = request.nextUrl
    const method = String(request.method || 'GET').toUpperCase()

    // SECURITY (CVE-2025-29927 + tenant spoofing): strip internal/spoofable
    // headers from the forwarded request BEFORE any routing or auth decision.
    // This is the authoritative copy forwarded downstream via NextResponse.next.
    const requestHeaders = stripInternalRequestHeaders(new Headers(request.headers))

    if (BLOCKED_HTTP_METHODS.has(method)) {
      return secureResponse({ error: 'Method Not Allowed' }, { status: 405 }, request)
    }

    if (pathname === '/api/health' || pathname === '/api/ping') {
      const response = NextResponse.next({ request: { headers: requestHeaders } })
      return applySecurityHeaders(response, request)
    }

    if (method === 'OPTIONS') {
      const headers = new Headers(getCorsHeaders(request))
      return new NextResponse(null, { status: 204, headers })
    }

    if (pathname.startsWith('/api') && isForbiddenCrossOrigin(request)) {
      return secureResponse({ error: 'Forbidden origin' }, { status: 403 }, request)
    }

    if (
      pathname.startsWith('/api') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
      !CSRF_EXEMPT_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))
    ) {
      const csrf = verifyCsrfRequest(request)
      if (!csrf.ok) {
        return secureResponse(
          { error: csrf.error || 'Invalid CSRF token' },
          { status: 403 },
          request
        )
      }
    }

    const rate = checkProxyRateLimit(request, pathname)
    if (rate.limited) {
      return secureResponse(
        { error: 'Too many requests', message: 'Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfter) },
        },
        request
      )
    }

    const hostname = request.headers.get('host') || ''
    const subdomain = getSubdomain(hostname)

    // Re-set the tenant subdomain ONLY from the verified hostname (the
    // client-supplied value was already stripped above).
    if (subdomain && subdomain !== 'www') {
      requestHeaders.set('x-school-subdomain', subdomain)
    }

    const protectedPaths = ['/dashboard', '/api']
    const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
    const isPublic = PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    )

    if (isProtected && !isPublic) {
      const hasToken =
        Boolean(request.cookies?.get?.('access_token')?.value) ||
        Boolean(request.cookies?.get?.('refresh_token')?.value) ||
        Boolean(request.cookies?.get?.('session-token')?.value) ||
        Boolean(request.cookies?.get?.('session')?.value) ||
        Boolean(request.headers.get('authorization'))

      if (!hasToken) {
        if (pathname.startsWith('/api')) {
          return secureResponse({ error: 'Unauthorized' }, { status: 401 }, request)
        }
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        const redirect = NextResponse.redirect(loginUrl)
        return applySecurityHeaders(redirect, request)
      }
    }

    // Uniform server-side role gate for all admin-prefixed APIs.
    if (pathname.startsWith('/api/admin')) {
      const payload = await decodeAccessToken(request)
      const rk = roleKey(payload?.role)
      if (!payload?.id || !ADMIN_ROLE_KEYS.has(rk)) {
        return secureResponse({ error: 'Forbidden' }, { status: 403 }, request)
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    applySecurityHeaders(response, request)

    if (pathname.startsWith('/api/v1/')) {
      response.headers.set('Deprecation', 'true')
      response.headers.set('Sunset', 'Tue, 31 Dec 2026 23:59:59 GMT')
      response.headers.set('Link', '</api>; rel="successor-version"')
    }

    return response
  } catch {
    const response = NextResponse.next()
    return applySecurityHeaders(response, request)
  }
}

export default handleSecurityProxy

const ADMIN_ROLE_KEYS = new Set([
  'admin',
  'administrator',
  'headteacher',
  'schooladministrator',
  'schooladmin',
  'principal',
  'headmaster',
  'superadmin',
])

function roleKey(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

async function decodeAccessToken(request) {
  const bearer = String(request.headers.get('authorization') || '')
  const token =
    request.cookies?.get?.('access_token')?.value ||
    (bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '')
  if (!token) return null

  const secret = String(process.env.JWT_SECRET || '').trim()
  if (!secret) return null

  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret))
    return payload || null
  } catch {
    return null
  }
}

function getSubdomain(hostname) {
  if (
    !hostname ||
    hostname === 'localhost:3000' ||
    hostname === 'localhost' ||
    hostname.endsWith('.vercel.app')
  )
    return null
  const parts = hostname.split('.')
  if (parts.length > 2) return parts[0]
  return null
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
