export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'

export async function POST(request) {
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
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
    }

    // 3. Rotation check: Look up token in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })

    if (!tokenRecord || tokenRecord.revoked) {
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

    const host = request?.headers?.get?.('host') || ''
    const hostName = String(host || '')
      .split(':')[0]
      .toLowerCase()
    const cookieDomain = (() => {
      const configured = process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN).trim() : ''
      if (!configured) return undefined
      if (!hostName || hostName === 'localhost' || /^[0-9.]+$/.test(hostName)) return undefined
      const normalized = configured.startsWith('.') ? configured으로 : configured
      if (!hostName.endsWith(normalized)) return undefined
      return configured.startsWith('.') ? configured : `.${configured}`
    })()

    // 4. Generate new tokens
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    const newRefreshTokenValue = jwt.sign(
      { id: user.id, schoolId: user.schoolId },
      JWT_REFRESH_SECRET,
      {
        expiresIn: '7d',
      }
    )

    // 5. Rotate tokens in DB: Revoke old, create new
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

    const response = NextResponse.json({ success: true, accessToken: newAccessToken })

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    response.cookies.set('refresh_token', newRefreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
  }
}
