export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { sendOnboardingVerificationEmail } from '@/config/email'

function isValidEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request) {
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 20 : 200,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'onboarding_resend_',
    keyGenerator: ({ ip }) => `${ip}`,
  })
  if (rl.isLimited) return rl.response

  const body = await request.json().catch(() => ({}))
  const email = String(body?.email || '')
    .trim()
    .toLowerCase()

  if (!isValidEmail(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  const reg = await prisma.schoolRegistration.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      isVerified: true,
      lastVerificationSentAt: true,
    },
  })

  if (!reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  if (reg.isVerified) {
    return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
  }

  const now = Date.now()
  const last = reg.lastVerificationSentAt ? new Date(reg.lastVerificationSentAt).getTime() : 0
  const elapsed = last ? now - last : Number.POSITIVE_INFINITY
  if (elapsed < 60_000) {
    const retryAfter = Math.max(1, Math.ceil((60_000 - elapsed) / 1000))
    return NextResponse.json(
      { error: `Please wait ${retryAfter}s before resending`, retryAfter },
      { status: 429 }
    )
  }

  const verificationToken = crypto.randomUUID()
  const verificationExpiry = new Date(now + 24 * 60 * 60 * 1000)

  await prisma.schoolRegistration.update({
    where: { id: reg.id },
    data: {
      verificationToken,
      verificationExpiry,
      lastVerificationSentAt: new Date(now),
    },
  })

  const baseDomain = process.env.APP_BASE_DOMAIN || 'bluepeacktechnologies.com'
  const verifyUrl = `https://${baseDomain}/api/onboarding/verify/${verificationToken}`
  await sendOnboardingVerificationEmail({ to: email, verifyUrl })

  return NextResponse.json({ success: true }, { status: 200 })
}
