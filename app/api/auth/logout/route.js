export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import {
  authCookieOptions,
  refreshTokenCookieOptions,
  resolveCookieDomain,
} from '@/lib/security/cookies'
import { csrfCookieOptions } from '@/lib/security/csrf'
import { getCorsHeaders } from '@/lib/security/headers'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { authMiddleware } from '@/lib/middleware/auth'
import { revokeAllUserRefreshTokens } from '@/lib/auth/sessionRevocation'
import { logger, captureError } from '@/lib/utils/logger'

/** Host-only by default; only add COOKIE_DOMAIN when explicitly configured in env. */
function logoutCookieDomains(request) {
  const explicit = resolveCookieDomain(request)
  return explicit ? [undefined, explicit] : [undefined]
}

function clearSessionCookies(response, request, domain) {
  const domainOpt = domain ? { domain } : {}

  response.cookies.set('access_token', '', {
    ...authCookieOptions(request, { maxAgeSeconds: 0, name: 'access_token' }),
    maxAge: 0,
    httpOnly: true,
    ...domainOpt,
  })

  response.cookies.set('refresh_token', '', {
    ...refreshTokenCookieOptions(request, { maxAgeSeconds: 0 }),
    maxAge: 0,
    httpOnly: true,
    ...domainOpt,
  })

  for (const legacyName of ['session-token', 'session']) {
    response.cookies.set(legacyName, '', {
      ...authCookieOptions(request, { maxAgeSeconds: 0, name: legacyName }),
      maxAge: 0,
      httpOnly: true,
      ...domainOpt,
    })
  }

  // CSRF double-submit cookie must remain readable by client JS — HttpOnly intentionally omitted.
  response.cookies.set('csrf_token', '', {
    ...csrfCookieOptions(request),
    maxAge: 0,
    httpOnly: false,
    ...domainOpt,
  })
}

export const POST = withSecureApi(async function POST(request) {
  const route = '/api/auth/logout'
  try {
    const auth = await authMiddleware(request)
    if (auth.isAuthenticated && auth.user?.id) {
      await revokeAllUserRefreshTokens(auth.user.id).catch((err) => {
        captureError(err, { route, userId: auth.user.id })
      })
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    for (const domain of logoutCookieDomains(request)) {
      clearSessionCookies(response, request, domain)
    }

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    captureError(error, { route })
    logger({ route }).error('Logout failed', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
})

export const OPTIONS = withSecureApi(async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
})
