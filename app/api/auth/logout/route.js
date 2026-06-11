export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authCookieOptions, refreshTokenCookieOptions } from '@/lib/security/cookies'
import { csrfCookieOptions } from '@/lib/security/csrf'
import { getCorsHeaders } from '@/lib/security/headers'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const POST = withSecureApi(async function POST(request) {
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
})

export const OPTIONS = withSecureApi(async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
})
