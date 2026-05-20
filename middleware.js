import { NextResponse } from 'next/server'
import {
  applySecurityHeaders,
  BLOCKED_HTTP_METHODS,
  getCorsHeaders,
  isForbiddenCrossOrigin,
} from './lib/security/headers'
import { checkProxyRateLimit } from './lib/security/proxyRateLimit'

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
  '/api/sms/inbound',
  '/api/sms/delivery',
  '/api/public',
  '/api/public/features',
  '/api/public/platform-stats',
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

function secureResponse(body, init, request) {
  const response = body === null ? new NextResponse(null, init) : NextResponse.json(body, init)
  return applySecurityHeaders(response, request)
}

/** Edge middleware (OpenNext Cloudflare requires middleware.js, not proxy.js). */
export default function middleware(request) {
  try {
    const { pathname } = request.nextUrl
    const method = String(request.method || 'GET').toUpperCase()

    if (BLOCKED_HTTP_METHODS.has(method)) {
      return secureResponse({ error: 'Method Not Allowed' }, { status: 405 }, request)
    }

    if (pathname === '/api/health' || pathname === '/api/ping') {
      const response = NextResponse.next()
      return applySecurityHeaders(response, request)
    }

    if (method === 'OPTIONS') {
      const headers = new Headers(getCorsHeaders(request))
      return new NextResponse(null, { status: 204, headers })
    }

    if (pathname.startsWith('/api') && isForbiddenCrossOrigin(request)) {
      return secureResponse({ error: 'Forbidden origin' }, { status: 403 }, request)
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

    const requestHeaders = new Headers(request.headers)
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

function getSubdomain(hostname) {
  if (
    !hostname ||
    hostname === 'localhost:3000' ||
    hostname === 'localhost' ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.workers.dev')
  )
    return null
  const parts = hostname.split('.')
  if (parts.length > 2) return parts[0]
  return null
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
