import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'

export async function POST() {
  try {
    const cookieStore = cookies()
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

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '15m' }
    )

    const response = NextResponse.json({ success: true, accessToken: newAccessToken })

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token', stopRetry: true }, { status: 401 })
  }
}
