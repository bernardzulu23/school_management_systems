import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request) {
  const host = request?.headers?.get?.('host') || ''
  const hostName = String(host || '')
    .split(':')[0]
    .toLowerCase()
  const hostParts = hostName.split('.').filter(Boolean)
  const computedRootDomain =
    hostParts.length >= 2 && hostName !== 'localhost' && !/^[0-9.]+$/.test(hostName)
      ? `.${hostParts.slice(-2).join('.')}`
      : undefined

  const domains = Array.from(
    new Set(
      [
        undefined,
        process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN) : undefined,
        computedRootDomain,
      ].filter((d) => d !== null)
    )
  )

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })

  for (const domain of domains) {
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
      ...(domain ? { domain } : {}),
    })
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
      ...(domain ? { domain } : {}),
    })
  }

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
