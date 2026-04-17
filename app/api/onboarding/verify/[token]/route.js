import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { signOnboardingToken } from '@/lib/middleware/onboardingAuth'

export async function GET(request, { params }) {
  const routeParams = await params
  const token = String(routeParams?.token || '').trim()
  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const reg = await prisma.schoolRegistration.findFirst({
    where: { verificationToken: token },
    select: {
      id: true,
      isVerified: true,
      verificationExpiry: true,
    },
  })

  if (!reg) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  if (reg.verificationExpiry && new Date(reg.verificationExpiry).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 })
  }

  await prisma.schoolRegistration.update({
    where: { id: reg.id },
    data: { isVerified: true, verificationToken: null, verificationExpiry: null },
  })

  const onboardingToken = signOnboardingToken(reg.id)
  const cookieDomain = (() => {
    const configured = process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN).trim() : ''
    if (!configured) return undefined
    const host = request.headers.get('host') || ''
    const hostName = String(host || '')
      .split(':')[0]
      .toLowerCase()
    if (!hostName || hostName === 'localhost' || /^[0-9.]+$/.test(hostName)) return undefined
    const normalized = configured.startsWith('.') ? configured.slice(1) : configured
    if (!hostName.endsWith(normalized)) return undefined
    return configured.startsWith('.') ? configured : `.${configured}`
  })()

  cookies().set('onboarding_token', onboardingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 2 * 24 * 60 * 60,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })

  const baseDomain = process.env.APP_BASE_DOMAIN || 'bluepeacktechnologies.com'
  return NextResponse.redirect(`https://${baseDomain}/onboarding?step=plan`)
}
