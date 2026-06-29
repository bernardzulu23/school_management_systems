import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { signOnboardingToken } from '@/lib/middleware/onboardingAuth'
import { individualOnboardingRedirectPath } from '@/lib/onboarding/individual'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const GET = withSecureHandler(async function GET(request, { params }) {
  const token = await safeRouteParam(params, 'token')
  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const reg = await prisma.schoolRegistration.findFirst({
    where: { verificationToken: token },
    select: {
      id: true,
      isVerified: true,
      verificationExpiry: true,
      plan: true,
      paymentStatus: true,
      schoolType: true,
      accountType: true,
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

  const cookieStore = await cookies()
  cookieStore.set('onboarding_token', onboardingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 2 * 24 * 60 * 60,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })

  const plan = String(reg?.plan || '')
    .trim()
    .toLowerCase()
  const paymentStatus = String(reg?.paymentStatus || '')
    .trim()
    .toLowerCase()
  const isIndividual = String(reg?.schoolType || 'SCHOOL').toUpperCase() === 'INDIVIDUAL'
  const step = isIndividual || plan === 'trial' || paymentStatus === 'paid' ? 'setup' : 'plan'

  const host = request.headers.get('host') || ''
  const isLocal =
    host.includes('localhost') || host.startsWith('127.0.0.1') || /^[0-9.]+:\d+$/.test(host)
  const origin = host
    ? `${isLocal ? 'http' : 'https'}://${host}`
    : `https://${process.env.APP_BASE_DOMAIN || 'bluepeacktechnologies.com'}`

  const path = isIndividual
    ? individualOnboardingRedirectPath(reg, step)
    : `/onboarding?step=${step === 'setup' ? 'setup' : 'plan'}`

  return NextResponse.redirect(`${origin}${path}`)
})
