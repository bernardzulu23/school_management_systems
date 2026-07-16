import { NextResponse } from 'next/server'
import * as jose from 'jose'
import {
  applySecurityHeaders,
  BLOCKED_HTTP_METHODS,
  buildContentSecurityPolicy,
  generateNonce,
  isForbiddenCrossOrigin,
  isStaticAssetPath,
  stripInternalRequestHeaders,
} from './lib/security/headers'
import { checkProxyRateLimit } from './lib/security/proxyRateLimit'
import { isPublicEdgeCachePath } from './lib/security/publicEdgeCache'
import { checkAntiScraping, checkApiScrapeRateLimit } from './lib/security/antiScraping'
import { verifyCsrfRequest } from './lib/security/csrf'
import {
  matchDashboardRoleGate,
  roleMatchesDashboardGroups,
} from './lib/security/dashboardRouteAuth'
import {
  clearActivityCookie,
  idleTimeoutPayload,
  isIdleTimedOut,
  isPassiveActivityPath,
  readActivityAt,
  shouldEnforceCookieIdle,
  stampActivityOnResponse,
} from './lib/security/sessionActivity'
import { clearAuthSessionCookies } from './lib/security/cookies'

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
  '/api/sms/queue-worker',
  '/api/sms/broadcast-dispatcher',
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
  '/api/notifications/web-push/vapid-public-key',
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
  '/api/sms/queue-worker',
  '/api/sms/broadcast-dispatcher',
  '/api/health',
  '/api/ping',
]

function secureResponse(body, init, request, securityOptions = {}) {
  const response = body === null ? new NextResponse(null, init) : NextResponse.json(body, init)
  return applySecurityHeaders(response, request, securityOptions)
}

function isPublicApiPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/** Next.js 16 proxy — multi-tenant subdomain routing and API security. */
export async function handleSecurityProxy(request) {
  try {
    const { pathname } = request.nextUrl
    const method = String(request.method || 'GET').toUpperCase()

    const nonce = generateNonce()
    const isStaticAsset = isStaticAssetPath(pathname)
    const isDocumentGet =
      method === 'GET' &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/_next/static') &&
      !pathname.startsWith('/_next/image') &&
      !isStaticAsset
    const isPublicMarketingDoc = isDocumentGet && isPublicEdgeCachePath(pathname)

    const allowEval = pathname.includes('/code-playground')
    const cspHeader = buildContentSecurityPolicy({ nonce, allowEval })

    // SECURITY (CVE-2025-29927 + tenant spoofing): strip internal/spoofable
    // headers from the forwarded request BEFORE any routing or auth decision.
    // This is the authoritative copy forwarded downstream via NextResponse.next.
    const requestHeaders = stripInternalRequestHeaders(new Headers(request.headers))
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('x-current-path', pathname)

    // Next.js 16 reads CSP from the request to attach nonces to framework scripts/styles.
    if (isDocumentGet) {
      requestHeaders.set('Content-Security-Policy', cspHeader)
    }

    const securityOpts = {
      pathname,
      nonce: isStaticAsset ? false : nonce,
      allowEval,
    }

    if (BLOCKED_HTTP_METHODS.has(method)) {
      return secureResponse({ error: 'Method Not Allowed' }, { status: 405 }, request, securityOpts)
    }

    if (pathname === '/api/health' || pathname === '/api/ping') {
      const response = NextResponse.next({ request: { headers: requestHeaders } })
      return applySecurityHeaders(response, request, securityOpts)
    }

    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 })
      return applySecurityHeaders(response, request, securityOpts)
    }

    if (pathname.startsWith('/api') && isForbiddenCrossOrigin(request)) {
      return secureResponse({ error: 'Forbidden origin' }, { status: 403 }, request, securityOpts)
    }

    if (pathname.startsWith('/api')) {
      const isPublicApi = isPublicApiPath(pathname)
      const scrape = checkAntiScraping(request, pathname, { isPublic: isPublicApi })
      if (scrape.blocked) {
        return secureResponse(
          {
            error: 'Forbidden',
            message: 'This request was blocked for security reasons.',
          },
          { status: scrape.status || 403 },
          request,
          securityOpts
        )
      }

      const scrapeRate = checkApiScrapeRateLimit(request, pathname, { isPublic: isPublicApi })
      if (scrapeRate.limited) {
        return secureResponse(
          { error: 'Too many requests', message: 'Please try again later.' },
          {
            status: 429,
            headers: { 'Retry-After': String(scrapeRate.retryAfter) },
          },
          request,
          securityOpts
        )
      }
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
          request,
          securityOpts
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
        request,
        securityOpts
      )
    }

    const hostname = request.headers.get('host') || ''
    const subdomain = getSubdomain(hostname)

    // Re-set the tenant subdomain ONLY from the verified hostname (the
    // client-supplied value was already stripped above).
    if (subdomain && subdomain !== 'www') {
      requestHeaders.set('x-school-subdomain', subdomain)
    }

    const protectedPaths = ['/dashboard', '/platform', '/api']
    const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
    const isPublic = isPublicApiPath(pathname)

    if (isProtected && !isPublic) {
      const hasToken =
        Boolean(request.cookies?.get?.('access_token')?.value) ||
        Boolean(request.cookies?.get?.('refresh_token')?.value) ||
        Boolean(request.cookies?.get?.('session-token')?.value) ||
        Boolean(request.cookies?.get?.('session')?.value) ||
        Boolean(request.headers.get('authorization'))

      if (!hasToken) {
        if (pathname.startsWith('/api')) {
          return secureResponse({ error: 'Unauthorized' }, { status: 401 }, request, securityOpts)
        }
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        const redirect = NextResponse.redirect(loginUrl)
        return applySecurityHeaders(redirect, request, securityOpts)
      }
    }

    // Server-side idle timeout for web cookie sessions (Bearer / mobile exempt).
    // Applies to /dashboard, /platform, and cookie-backed /api including passive me/refresh.
    if (shouldEnforceCookieIdle(request, pathname)) {
      const activityAt = await readActivityAt(request)
      if (isIdleTimedOut(activityAt)) {
        if (pathname.startsWith('/api')) {
          const idleRes = secureResponse(
            idleTimeoutPayload(),
            { status: 401 },
            request,
            securityOpts
          )
          clearAuthSessionCookies(idleRes, request)
          clearActivityCookie(idleRes, request)
          return idleRes
        }
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('reason', 'idle')
        loginUrl.searchParams.set('from', pathname)
        const redirect = NextResponse.redirect(loginUrl)
        clearAuthSessionCookies(redirect, request)
        clearActivityCookie(redirect, request)
        applySecurityHeaders(redirect, request, securityOpts)
        return redirect
      }
    }

    // Server-side role gate for role-specific dashboard portals (BOLA prevention).
    if (pathname.startsWith('/dashboard')) {
      const dashboardGate = matchDashboardRoleGate(pathname)
      if (dashboardGate) {
        const payload = await decodeAccessToken(request)
        if (!payload?.id) {
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('from', pathname)
          const redirect = NextResponse.redirect(loginUrl)
          return applySecurityHeaders(redirect, request, securityOpts)
        }
        if (!roleMatchesDashboardGroups(payload.role, dashboardGate.groups)) {
          return secureResponse(
            {
              error: 'Forbidden',
              message: 'This request was blocked for security reasons.',
            },
            { status: 403 },
            request,
            securityOpts
          )
        }
      }
    }

    // Uniform server-side role gate for all admin-prefixed APIs.
    if (pathname.startsWith('/api/admin')) {
      const payload = await decodeAccessToken(request)
      if (payload?.id) {
        const rk = roleKey(payload?.role)
        if (!ADMIN_ROLE_KEYS.has(rk)) {
          return secureResponse({ error: 'Forbidden' }, { status: 403 }, request, securityOpts)
        }
      } else {
        const hasRefresh =
          Boolean(request.cookies?.get?.('refresh_token')?.value) ||
          Boolean(request.cookies?.get?.('session-token')?.value) ||
          Boolean(request.cookies?.get?.('session')?.value)
        if (!hasRefresh) {
          return secureResponse({ error: 'Unauthorized' }, { status: 401 }, request, securityOpts)
        }
        // Expired access token — let the route handler respond; client refresh + retry.
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    applySecurityHeaders(response, request, securityOpts)

    // Stamp last-activity on genuine interaction (not passive polls / heartbeats).
    if (shouldEnforceCookieIdle(request, pathname) && !isPassiveActivityPath(pathname)) {
      await stampActivityOnResponse(response, request)
    }

    if (pathname.startsWith('/api/v1/')) {
      response.headers.set('Deprecation', 'true')
      response.headers.set('Sunset', 'Tue, 31 Dec 2026 23:59:59 GMT')
      response.headers.set('Link', '</api>; rel="successor-version"')
    }

    return response
  } catch {
    const response = NextResponse.next()
    return applySecurityHeaders(response, request, {
      nonce: generateNonce(),
      pathname: request?.nextUrl?.pathname || '',
    })
  }
}

export default handleSecurityProxy

const ADMIN_ROLE_KEYS = new Set([
  'admin',
  'administrator',
  'headteacher',
  'schooladministrator',
  'schooladmin',
  'schoolprincipal',
  'principal',
  'headmaster',
  'superadmin',
  'deputyheadteacher',
  'deputyhead',
])

function roleKey(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function jwtSecretKeys() {
  const enc = new TextEncoder()
  const keys = [enc.encode(String(process.env.JWT_SECRET || '').trim())]
  const previous = String(process.env.JWT_SECRET_PREVIOUS || '').trim()
  if (previous) keys.push(enc.encode(previous))
  return keys.filter((k) => k.length > 0)
}

async function decodeAccessToken(request) {
  const bearer = String(request.headers.get('authorization') || '')
  const token =
    request.cookies?.get?.('access_token')?.value ||
    (bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '')
  if (!token) return null

  const keys = jwtSecretKeys()
  if (!keys.length) return null

  for (const key of keys) {
    try {
      const { payload } = await jose.jwtVerify(token, key, { algorithms: ['HS256'] })
      return payload || null
    } catch {
      /* try next signing key */
    }
  }
  return null
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
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
