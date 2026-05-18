export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  authCookieOptions,
} from '@/lib/security/cookies'
import { withSecureApi } from '@/lib/middleware/secureApi'
import {
  signPlatformToken,
  verifyPlatformAdminCredentials,
  ensurePlatformAdminFromEnv,
} from '@/lib/platform/platformAdminAuth'
import jwt from 'jsonwebtoken'

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'

export const POST = withSecureApi(async function POST(request) {
  try {
    const body = await request.json()
    const email = String(body?.email || '')
      .trim()
      .toLowerCase()
    const password = String(body?.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const isProd = process.env.NODE_ENV === 'production'
    const rateLimitResult = rateLimiter(request, {
      limit: isProd ? 8 : 40,
      windowMs: 5 * 60 * 1000,
      keyPrefix: 'platform_login_',
      keyGenerator: ({ ip }) => `${ip}-${email}`,
    })
    if (rateLimitResult.isLimited) return rateLimitResult.response

    await ensurePlatformAdminFromEnv()

    const admin = await verifyPlatformAdminCredentials(email, password)
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const accessToken = signPlatformToken(admin)
    const refreshToken = jwt.sign({ id: admin.id, isPlatform: true }, JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    })

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

    return response
  } catch (error) {
    console.error('[platform login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
