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
  refreshTokenCookieOptions,
} from '@/lib/security/cookies'
import { setCsrfCookie } from '@/lib/security/csrf'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { JWT_AUDIENCE } from '@/lib/middleware/auth'
import { signPlatformToken } from '@/lib/platform/platformAdminAuth'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'
/** Benign concurrent refresh: old token revoked within this window should not mass-revoke sessions. */
const REFRESH_ROTATION_GRACE_MS = Math.max(
  5000,
  Number(process.env.REFRESH_ROTATION_GRACE_MS) || 30000
)

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
        refreshTokenCookieOptions(request, { maxAgeSeconds: REFRESH_TOKEN_MAX_AGE })
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
        select: { id: true, token: true, revoked: true, userId: true, updatedAt: true },
      })
    } catch (e) {
      canUseDbTokenRotation = false
      console.warn(
        '[Refresh] Token table unavailable; falling back to stateless refresh:',
        e?.message
      )
    }

    if (canUseDbTokenRotation && tokenRecord?.revoked) {
      const revokedAt = tokenRecord.updatedAt ? new Date(tokenRecord.updatedAt).getTime() : 0
      const recentlyRotated = revokedAt > 0 && Date.now() - revokedAt < REFRESH_ROTATION_GRACE_MS

      if (!recentlyRotated) {
        // POTENTIAL ATTACK: reuse of a rotated refresh token — revoke all sessions.
        await prisma.refreshToken.updateMany({
          where: { userId: decoded.id },
          data: { revoked: true },
        })
        console.warn(
          `[Security] Refresh token reuse detected for user ${decoded.id}. All sessions revoked.`
        )
        return NextResponse.json(
          { error: 'Session expired or revoked', stopRetry: true },
          { status: 401 }
        )
      }
      // Concurrent refresh in another tab — allow issuing a new session below.
    }

    // Missing DB row but JWT verified: allow refresh (login may have failed to persist token).

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

    // 5. Rotate tokens in DB: Revoke old when present, always persist new refresh token.
    if (canUseDbTokenRotation) {
      if (tokenRecord?.id) {
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
      } else {
        await prisma.refreshToken.create({
          data: {
            token: newRefreshTokenValue,
            userId: user.id,
            schoolId: user.schoolId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      }
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
      refreshTokenCookieOptions(request, { maxAgeSeconds: REFRESH_TOKEN_MAX_AGE })
    )
    setCsrfCookie(response, request)

    return response
  } catch (error) {
    console.error('[Refresh] Unexpected error:', error?.message || error)
    return NextResponse.json(
      { error: 'Refresh temporarily unavailable', stopRetry: false },
      { status: 503 }
    )
  }
})
