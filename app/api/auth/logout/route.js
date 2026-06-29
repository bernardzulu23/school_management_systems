export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authCookieOptions, refreshTokenCookieOptions } from '@/lib/security/cookies'
import { csrfCookieOptions } from '@/lib/security/csrf'
import { getCorsHeaders } from '@/lib/security/headers'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { authMiddleware } from '@/lib/middleware/auth'
import { revokeAllUserRefreshTokens } from '@/lib/auth/sessionRevocation'
import { logger, captureError } from '@/lib/utils/logger'

export const POST = withSecureApi(async function POST(request) {
  const route = '/api/auth/logout'
  try {
    const auth = await authMiddleware(request)
    if (auth.isAuthenticated && auth.user?.id) {
      await revokeAllUserRefreshTokens(auth.user.id).catch((err) => {
        captureError(err, { route, userId: auth.user.id })
      })
    }

    const host = request?.headers?.get?.('host') || ''
    const hostName = String(host || '')
      .split(':')[0]
      .toLowerCase()
    const hostParts = hostName.split('.').filter(Boolean)
    const computedRootDomain =
      hostParts.length >= 2 && hostName !== 'localhost' && !/^[0-9.]+$/.test(hostName)
        ? `.${hostParts.slice(-2).join('.')}`
        : undefined

    const domains = Array.from(
      new Set(
        [
          undefined,
          process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN) : undefined,
          computedRootDomain,
        ].filter((d) => d !== null)
      )
    )

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    for (const domain of domains) {
      const clearOpts = {
        ...authCookieOptions(request, { maxAgeSeconds: 0, name: 'access_token' }),
        maxAge: 0,
        ...(domain ? { domain } : {}),
      }
      response.cookies.set('access_token', '', clearOpts)
      response.cookies.set('refresh_token', '', {
        ...refreshTokenCookieOptions(request, { maxAgeSeconds: 0 }),
        maxAge: 0,
        ...(domain ? { domain } : {}),
      })
      response.cookies.set('csrf_token', '', {
        ...csrfCookieOptions(request),
        maxAge: 0,
        ...(domain ? { domain } : {}),
      })
    }

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
