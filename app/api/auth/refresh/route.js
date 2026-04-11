import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token', stopRetry: true }, { status: 401 })
    }

    // Verify refresh token
    let decoded
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.id, schoolId: decoded.schoolId },
      select: { id: true, email: true, role: true, schoolId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
    }

    const host = request?.headers?.get?.('host') || ''
    const hostName = String(host || '')
      .split(':')[0]
      .toLowerCase()
    const hostParts = hostName.split('.').filter(Boolean)
    const cookieDomain =
      hostParts.length > 2
        ? undefined
        : process.env.COOKIE_DOMAIN
          ? String(process.env.COOKIE_DOMAIN)
          : undefined

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    const newRefreshToken = jwt.sign({ id: user.id, schoolId: user.schoolId }, JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    })

    const response = NextResponse.json({ success: true, accessToken: newAccessToken })

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    response.cookies.set('refresh_token', newRefreshToken, {
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
