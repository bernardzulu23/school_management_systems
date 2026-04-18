import { NextResponse } from 'next/server'
import { rateLimiter } from './lib/middleware/rateLimiter'
import { authMiddleware, roleCheck } from './lib/middleware/auth'

export default async function proxy(request) {
  const { pathname } = request.nextUrl

  // 1. Rate Limiting
  const isAuthRoute = pathname.startsWith('/api/auth')
  const rateLimitOptions = isAuthRoute
    ? pathname === '/api/auth/login'
      ? { limit: 20, windowMs: 15 * 60 * 1000, keyPrefix: 'auth_login_ip_' }
      : pathname === '/api/auth/register'
        ? { limit: 20, windowMs: 15 * 60 * 1000, keyPrefix: 'auth_register_' }
        : { limit: 100, windowMs: 15 * 60 * 1000, keyPrefix: 'auth_' }
    : { limit: 100, windowMs: 15 * 60 * 1000 }
  const rateLimitResult = rateLimiter(request, rateLimitOptions)

  if (rateLimitResult.isLimited) {
    return rateLimitResult.response
  }

  // 1.5 CORS Handling
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'https://schoolmanagementsystems-production.up.railway.app',
    'http://localhost:3000',
  ]

  let allowOrigin = allowedOrigins.includes(origin) ? origin : ''
  if (
    !allowOrigin &&
    origin &&
    (origin.endsWith('.bluepeacktechnologies.com') || origin.endsWith('.railway.app'))
  ) {
    allowOrigin = origin
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const headers = new Headers()
    if (allowOrigin) {
      headers.set('Access-Control-Allow-Origin', allowOrigin)
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-School-Subdomain')
      headers.set('Access-Control-Allow-Credentials', 'true')
    }
    return new NextResponse(null, { status: 200, headers })
  }

  // 2. Security Headers (Helmet-like)
  const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://images.unsplash.com; font-src 'self' https://fonts.gstatic.com data:;",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }

  if (allowOrigin) {
    securityHeaders['Access-Control-Allow-Origin'] = allowOrigin
    securityHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    securityHeaders['Access-Control-Allow-Headers'] =
      'Content-Type, Authorization, X-School-Subdomain'
    securityHeaders['Access-Control-Allow-Credentials'] = 'true'
  }

  // 3. Subdomain / Multi-tenancy
  const hostname = request.headers.get('host') || ''
  const subdomain = getSubdomain(hostname)
  console.log(
    '[Proxy] Request Path:',
    pathname,
    'Host:',
    hostname,
    'Detected Subdomain:',
    subdomain
  )

  const requestHeaders = new Headers(request.headers)
  if (subdomain && subdomain !== 'www') {
    requestHeaders.set('x-school-subdomain', subdomain)
  }

  // 4. Authentication & Authorization
  const protectedPaths = ['/dashboard', '/api']
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/public',
    '/api/onboarding',
    '/api/schools/check-subdomain',
    '/api/schools/register',
    '/api/schools/verify',
    '/api/payments/lipila/callback',
    '/api/onboarding/lipila/callback',
    '/api/school/current',
    '/api/health',
    '/login',
    '/register',
    '/manifest.json',
    '/sw.js',
    '/',
  ]

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))

  if (isProtected && !isPublic) {
    const authResult = authMiddleware(request)

    if (!authResult.isAuthenticated) {
      if (pathname.startsWith('/api')) {
        return authResult.response
      } else {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Role-based access control for admin routes (headteacher = admin)
    if (
      pathname.startsWith('/api/admin') &&
      !roleCheck(authResult.user, ['ADMIN', 'headteacher'])
    ) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Signal v1 APIs are compatibility routes and may be retired.
  if (pathname.startsWith('/api/v1/')) {
    response.headers.set('Deprecation', 'true')
    response.headers.set('Sunset', 'Tue, 31 Dec 2026 23:59:59 GMT')
    response.headers.set('Link', '</api>; rel="successor-version"')
  }

  return response
}

function getSubdomain(hostname) {
  if (
    !hostname ||
    hostname === 'localhost:3000' ||
    hostname === 'localhost' ||
    hostname.includes('healthcheck.railway.app') ||
    hostname.includes('railway.app')
  )
    return null
  const parts = hostname.split('.')
  if (parts.length > 2) return parts[0]
  return null
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
