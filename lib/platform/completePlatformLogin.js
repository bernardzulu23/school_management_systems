import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  authCookieOptions,
} from '@/lib/security/cookies'
import { setCsrfCookie } from '@/lib/security/csrf'
import { signPlatformToken } from '@/lib/platform/platformAdminAuth'

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'

/**
 * Issue HTTP-only session cookies + CSRF for a verified platform administrator.
 */
export function buildPlatformLoginResponse(request, admin) {
  const accessToken = signPlatformToken(admin)
  const refreshToken = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      isPlatform: true,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

  const response = NextResponse.json({
    success: true,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'superadmin',
      isPlatform: true,
    },
  })

  response.cookies.set(
    'access_token',
    accessToken,
    authCookieOptions(request, { maxAgeSeconds: ACCESS_TOKEN_MAX_AGE, name: 'access_token' })
  )
  response.cookies.set(
    'refresh_token',
    refreshToken,
    authCookieOptions(request, { maxAgeSeconds: REFRESH_TOKEN_MAX_AGE, name: 'refresh_token' })
  )
  setCsrfCookie(response, request)

  return response
}
