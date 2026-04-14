import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
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
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const existing = await prisma.schoolRegistration.findUnique({ where: { email } })
  if (existing?.isVerified && existing?.paymentStatus === 'paid') {
    return NextResponse.json({ success: true, alreadyCompleted: true }, { status: 200 })
  }

  const verificationToken = crypto.randomUUID()
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const passwordHash = await bcrypt.hash(password, 12)

  const reg = await prisma.schoolRegistration.upsert({
    where: { email },
    create: {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      isVerified: false,
      verificationToken,
      verificationExpiry,
      paymentStatus: 'unpaid',
    },
    update: {
      passwordHash,
      isVerified: existing?.isVerified || false,
      verificationToken: existing?.isVerified ? existing.verificationToken : verificationToken,
      verificationExpiry: existing?.isVerified ? existing.verificationExpiry : verificationExpiry,
      paymentStatus: existing?.paymentStatus || 'unpaid',
      plan: existing?.plan || null,
    },
    select: { id: true },
  })

  if (!existing?.isVerified) {
    const baseDomain = process.env.APP_BASE_DOMAIN || 'bluepeacktechnologies.com'
    const verifyUrl = `https://${baseDomain}/api/onboarding/verify/${verificationToken}`
    await sendOnboardingVerificationEmail({ to: email, verifyUrl })
    return NextResponse.json({ success: true, requiresVerification: true })
  }

  return NextResponse.json({ success: true, alreadyVerified: true, requiresPayment: true })
}
