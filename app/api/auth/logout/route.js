import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request) {
  const host = request?.headers?.get?.('host') || ''
  const cookieDomain =
    process.env.COOKIE_DOMAIN ||
    (() => {
      const h = String(host || '').split(':')[0]
      if (!h || h === 'localhost' || /^[0-9.]+$/.test(h)) return undefined
      const parts = h.split('.').filter(Boolean)
      if (parts.length < 2) return undefined
      return `.${parts.slice(-2).join('.')}`
    })()

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })

  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })

  return response
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
