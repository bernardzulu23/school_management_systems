export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  authCookieOptions,
} from '@/lib/security/cookies'
import { setCsrfCookie } from '@/lib/security/csrf'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { JWT_AUDIENCE } from '@/lib/middleware/auth'
import { signPlatformToken } from '@/lib/platform/platformAdminAuth'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'

export const POST = withSecureApi(async function POST(request) {
  try {
    // 1. Rate Limiting
    const rateLimitResult = rateLimiter(request, {
      limit: process.env.NODE_ENV === 'production' ? 20 : 100,
      windowMs: 15 * 60 * 1000,
      keyPrefix: 'auth_refresh_',
      keyGenerator: ({ ip }) => ip,
    })
    if (rateLimitResult.isLimited) return rateLimitResult.response

    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token', stopRetry: true }, { status: 401 })
    }

    // 2. Verify refresh token
    let decoded
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ['HS256'] })
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
    }

    if (decoded.isPlatform) {
      const admin = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || 'Platform Super Admin',
      }
      if (!admin.id || !admin.email) {
        return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
      }

      const newAccessToken = signPlatformToken(admin)
      const newRefreshTokenValue = jwt.sign(
        { id: admin.id, email: admin.email, name: admin.name, isPlatform: true },
        JWT_REFRESH_SECRET,
        { algorithm: 'HS256', expiresIn: '7d' }
      )

      const response = NextResponse.json({ success: true, accessToken: newAccessToken })
      response.cookies.set(
        'access_token',
        newAccessToken,
        authCookieOptions(request, { maxAgeSeconds: ACCESS_TOKEN_MAX_AGE, name: 'access_token' })
      )
      response.cookies.set(
        'refresh_token',
        newRefreshTokenValue,
        authCookieOptions(request, { maxAgeSeconds: REFRESH_TOKEN_MAX_AGE, name: 'refresh_token' })
      )
      setCsrfCookie(response, request)
      return response
    }

    // 3. Rotation check: Look up token in database
    let tokenRecord = null
    let canUseDbTokenRotation = true
    try {
      tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })
    } catch (e) {
      canUseDbTokenRotation = false
      console.warn(
        '[Refresh] Token table unavailable; falling back to stateless refresh:',
        e?.message
      )
    }

    if (canUseDbTokenRotation && (!tokenRecord || tokenRecord.revoked)) {
      // POTENTIAL ATTACK: If the token was previously valid but now revoked,
      // someone might be trying to reuse an old token.
      // Invalidate all tokens for this user as a safety measure.
      if (tokenRecord && tokenRecord.revoked) {
        await prisma.refreshToken.updateMany({
          where: { userId: decoded.id },
          data: { revoked: true },
        })
        console.warn(
          `[Security] Refresh token reuse detected for user ${decoded.id}. All sessions revoked.`
        )
      }
      return NextResponse.json(
        { error: 'Session expired or revoked', stopRetry: true },
        { status: 401 }
      )
    }

    const user = await prisma.user.findFirst({
      where: decoded.schoolId ? { id: decoded.id, schoolId: decoded.schoolId } : { id: decoded.id },
      select: { id: true, email: true, role: true, schoolId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
    }

    // 4. Generate new tokens
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '8h', audience: JWT_AUDIENCE }
    )

    const newRefreshTokenValue = jwt.sign(
      { id: user.id, schoolId: user.schoolId },
      JWT_REFRESH_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '7d',
      }
    )

    // 5. Rotate tokens in DB: Revoke old, create new
    if (canUseDbTokenRotation && tokenRecord?.id) {
      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revoked: true },
        }),
        prisma.refreshToken.create({
          data: {
            token: newRefreshTokenValue,
            userId: user.id,
            schoolId: user.schoolId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ])
    }

    const response = NextResponse.json({ success: true, accessToken: newAccessToken })

    response.cookies.set(
      'access_token',
      newAccessToken,
      authCookieOptions(request, { maxAgeSeconds: ACCESS_TOKEN_MAX_AGE, name: 'access_token' })
    )

    response.cookies.set(
      'refresh_token',
      newRefreshTokenValue,
      authCookieOptions(request, { maxAgeSeconds: REFRESH_TOKEN_MAX_AGE, name: 'refresh_token' })
    )
    setCsrfCookie(response, request)

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
  }
})
