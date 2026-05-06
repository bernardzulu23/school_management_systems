import { NextResponse } from 'next/server'

export default function proxy(request) {
  try {
    const { pathname } = request.nextUrl

    if (pathname === '/api/health') {
      return NextResponse.next()
    }
    if (pathname === '/api/ping') {
      return NextResponse.next()
    }

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

    if (request.method === 'OPTIONS') {
      const headers = new Headers()
      if (allowOrigin) {
        headers.set('Access-Control-Allow-Origin', allowOrigin)
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        headers.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-School-Subdomain'
        )
        headers.set('Access-Control-Allow-Credentials', 'true')
      }
      return new NextResponse(null, { status: 200, headers })
    }

    const securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://images.unsplash.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.railway.app http://localhost:*;",
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

    const hostname = request.headers.get('host') || ''
    const subdomain = getSubdomain(hostname)

    const requestHeaders = new Headers(request.headers)
    if (subdomain && subdomain !== 'www') {
      requestHeaders.set('x-school-subdomain', subdomain)
    }

    const protectedPaths = ['/dashboard', '/api']
    const publicPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/auth/me',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/sms/inbound',
      '/api/sms/delivery',
      '/api/public',
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

    const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
    const isPublic = publicPaths.some(
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
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    if (pathname.startsWith('/api/v1/')) {
      response.headers.set('Deprecation', 'true')
      response.headers.set('Sunset', 'Tue, 31 Dec 2026 23:59:59 GMT')
      response.headers.set('Link', '</api>; rel="successor-version"')
    }

    return response
  } catch {
    return NextResponse.next()
  }
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
