export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { JWT_AUDIENCE } from '@/lib/middleware/auth'
import { buildSchoolAccessClaims } from '@/lib/auth/accessTokenClaims'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'
const ACCESS_TOKEN_MAX_AGE = 8 * 60 * 60

export const POST = withSecureHandler(async function POST(request) {
  const rateLimitResult = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 30 : 100,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'mobile_auth_refresh_',
  })
  if (rateLimitResult.isLimited) return rateLimitResult.response

  const body = await request.json().catch(() => ({}))
  const refreshToken = String(body?.refreshToken || '').trim()
  if (!refreshToken) {
    return NextResponse.json({ error: 'refreshToken is required' }, { status: 400 })
  }

  let decoded
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ['HS256'] })
  } catch {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
  }

  let tokenRecord = null
  let canUseDbTokenRotation = true
  try {
    tokenRecord = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, schoolId: decoded.schoolId },
      select: { id: true, revoked: true, userId: true },
    })
  } catch {
    canUseDbTokenRotation = false
  }

  if (canUseDbTokenRotation && tokenRecord?.revoked) {
    return NextResponse.json({ error: 'Session expired or revoked' }, { status: 401 })
  }

  // Production: refresh tokens must exist in DB so revocation is enforceable.
  // Heal orphaned JWTs from older logins where create() failed silently.
  if (canUseDbTokenRotation && !tokenRecord && process.env.NODE_ENV === 'production') {
    try {
      const expMs = decoded.exp ? Number(decoded.exp) * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: decoded.id,
          schoolId: decoded.schoolId,
          expiresAt: new Date(expMs),
        },
      })
      tokenRecord = { id: 'healed', revoked: false, userId: decoded.id }
    } catch {
      return NextResponse.json({ error: 'Session expired or revoked' }, { status: 401 })
    }
  }

  const user = await prisma.user.findFirst({
    where: { id: decoded.id, schoolId: decoded.schoolId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      schoolId: true,
      hodProfile: true,
      guidanceAssignment: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  const role = String(user.role || '').toLowerCase()
  if (role === 'student') {
    return NextResponse.json(
      { error: 'This request was blocked for security reasons.', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  const claims = buildSchoolAccessClaims(user)
  const accessToken = jwt.sign(claims, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '8h',
    audience: JWT_AUDIENCE,
  })

  return NextResponse.json({
    success: true,
    accessToken,
    expiresIn: ACCESS_TOKEN_MAX_AGE,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: claims.role,
      schoolId: user.schoolId,
    },
  })
})
