import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { sendOnboardingVerificationEmail } from '@/config/email'
import { signOnboardingToken } from '@/lib/middleware/onboardingAuth'

export const runtime = 'nodejs'

function isValidEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request) {
  try {
    const rl = rateLimiter(request, {
      limit: process.env.NODE_ENV === 'production' ? 10 : 100,
      windowMs: 15 * 60 * 1000,
      keyPrefix: 'onboarding_start_',
      keyGenerator: ({ ip }) => `${ip}`,
    })
    if (rl.isLimited) return rl.response

    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || '')
      .trim()
      .toLowerCase()
    const password = String(body?.password || '')
    const requestedPlan = String(body?.plan || '')
      .trim()
      .toLowerCase()
    const plan =
      requestedPlan === 'trial' ||
      requestedPlan === 'basic' ||
      requestedPlan === 'standard' ||
      requestedPlan === 'premium'
        ? requestedPlan
        : null
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existing = await prisma.schoolRegistration.findUnique({ where: { email } })
    if (existing?.isVerified && existing?.paymentStatus === 'paid') {
      return NextResponse.json({ success: true, alreadyCompleted: true }, { status: 200 })
    }

    if (existing && !existing.isVerified && existing.lastVerificationSentAt) {
      const last = new Date(existing.lastVerificationSentAt).getTime()
      const elapsed = Date.now() - last
      if (elapsed < 60_000) {
        const retryAfter = Math.max(1, Math.ceil((60_000 - elapsed) / 1000))
        return NextResponse.json(
          { error: `Please wait ${retryAfter}s before resending`, retryAfter },
          { status: 429 }
        )
      }
    }

    const verificationToken = crypto.randomUUID()
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const passwordHash = await bcrypt.hash(password, 12)
    const lastVerificationSentAt = new Date()

    const reg = await prisma.schoolRegistration.upsert({
      where: { email },
      create: {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        isVerified: false,
        verificationToken,
        verificationExpiry,
        lastVerificationSentAt,
        paymentStatus: plan === 'trial' ? 'paid' : 'unpaid',
        ...(plan ? { plan } : {}),
      },
      update: {
        passwordHash,
        isVerified: existing?.isVerified || false,
        verificationToken: existing?.isVerified ? existing.verificationToken : verificationToken,
        verificationExpiry: existing?.isVerified ? existing.verificationExpiry : verificationExpiry,
        lastVerificationSentAt: existing?.isVerified
          ? existing.lastVerificationSentAt
          : lastVerificationSentAt,
        paymentStatus:
          existing?.paymentStatus ||
          (existing?.plan === 'trial' || plan === 'trial' ? 'paid' : 'unpaid'),
        plan: existing?.plan || plan || null,
      },
      select: { id: true },
    })

    if (!existing?.isVerified) {
      const baseDomain = process.env.APP_BASE_DOMAIN || 'bluepeacktechnologies.com'
      const verifyUrl = `https://${baseDomain}/api/onboarding/verify/${verificationToken}`
      const sent = await sendOnboardingVerificationEmail({ to: email, verifyUrl })
      if (!sent) {
        return NextResponse.json(
          { error: 'Email service is not configured. Contact support.' },
          { status: 502 }
        )
      }
      return NextResponse.json({ success: true, requiresVerification: true })
    }

    const onboardingToken = signOnboardingToken(reg.id)
    const host = request.headers.get('host') || ''
    const hostName = String(host || '')
      .split(':')[0]
      .toLowerCase()
    const cookieDomain = (() => {
      const configured = process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN).trim() : ''
      if (!configured) return undefined
      if (!hostName || hostName === 'localhost' || /^[0-9.]+$/.test(hostName)) return undefined
      const normalized = configured.startsWith('.') ? configured.slice(1) : configured
      if (!hostName.endsWith(normalized)) return undefined
      return configured.startsWith('.') ? configured : `.${configured}`
    })()

    const planForFlow = String(existing?.plan || plan || '')
      .trim()
      .toLowerCase()
    const requiresPayment = planForFlow !== 'trial'

    const response = NextResponse.json({
      success: true,
      alreadyVerified: true,
      requiresPayment,
    })
    response.cookies.set('onboarding_token', onboardingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 24 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
    return response
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to start onboarding',
        ...(process.env.NODE_ENV === 'development'
          ? { details: String(error?.message || error) }
          : {}),
      },
      { status: 500 }
    )
  }
}
