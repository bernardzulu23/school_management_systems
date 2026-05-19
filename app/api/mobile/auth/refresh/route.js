export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withSecureApi } from '@/lib/middleware/secureApi'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'
const ACCESS_TOKEN_MAX_AGE = 8 * 60 * 60

export const POST = withSecureApi(async function POST(request) {
  try {
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
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    } catch {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.id, schoolId: decoded.schoolId },
      select: { id: true, email: true, name: true, role: true, schoolId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    return NextResponse.json({
      success: true,
      accessToken,
      expiresIn: ACCESS_TOKEN_MAX_AGE,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
      },
    })
  } catch (error) {
    console.error('[mobile auth refresh]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
