import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'
import { sendWelcomeEmail } from '@/config/email'

const RESERVED = new Set([
  'www',
  'admin',
  'api',
  'dashboard',
  'app',
  'login',
  'register',
  'onboarding',
])

function normalizeSubdomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeLevel(value) {
  const level = String(value || '')
    .trim()
    .toLowerCase()
  if (['primary', 'secondary', 'combined'].includes(level)) return level
  return null
}

function planToExpiresAt(plan) {
  const p = String(plan || '')
    .trim()
    .toLowerCase()
  if (!['basic', 'standard', 'premium'].includes(p)) return null
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
}

export async function POST(request) {
  const token = request.cookies.get('onboarding_token')?.value || ''
  const registrationId = verifyOnboardingToken(token)
  if (!registrationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reg = await prisma.schoolRegistration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isVerified: true,
      plan: true,
      paymentStatus: true,
    },
  })
  if (!reg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!reg.isVerified)
    return NextResponse.json({ error: 'Verify your email first' }, { status: 401 })
  if (String(reg.paymentStatus || '').toLowerCase() !== 'paid') {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 })
  }

  const body = await request.json().catch(() => ({}))
  const schoolName = String(body?.schoolName || '').trim()
  const subdomain = normalizeSubdomain(body?.subdomain)
  const level = normalizeLevel(body?.level)
  const adminName = String(body?.adminName || '').trim()

  if (!schoolName || schoolName.length < 2) {
    return NextResponse.json({ error: 'School name is required' }, { status: 400 })
  }
  if (!subdomain || subdomain.length < 3) {
    return NextResponse.json({ error: 'Subdomain must be at least 3 characters' }, { status: 400 })
  }
  if (RESERVED.has(subdomain)) {
    return NextResponse.json({ error: 'Subdomain is reserved' }, { status: 409 })
  }
  if (!level) return NextResponse.json({ error: 'Invalid school level' }, { status: 400 })
  if (!adminName || adminName.length < 2) {
    return NextResponse.json({ error: 'Admin name is required' }, { status: 400 })
  }

  const existingSchool = await prisma.school.findFirst({
    where: { subdomain: { equals: subdomain, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existingSchool)
    return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 })

  const baseDomain = String(
    process.env.BASE_DOMAIN || process.env.COOKIE_DOMAIN || 'bluepeacktechnologies.com'
  )
    .trim()
    .replace(/^\./, '')
  const isLocal = baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1')
  const loginUrl = isLocal ? `/login` : `https://${subdomain}.${baseDomain}/login`

  const created = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: schoolName,
        subdomain,
        domain: `${subdomain}.${baseDomain}`,
        email: reg.email,
        plan: String(reg.plan || 'basic').toLowerCase(),
        planExpiresAt: planToExpiresAt(reg.plan),
        trialEndsAt: null,
        level,
        active: true,
        emailVerified: true,
      },
      select: { id: true, name: true, subdomain: true },
    })

    await tx.user.create({
      data: {
        schoolId: school.id,
        email: reg.email,
        password: reg.passwordHash,
        name: adminName,
        role: 'headteacher',
      },
      select: { id: true },
    })

    await tx.schoolRegistration.update({
      where: { id: reg.id },
      data: { schoolName, subdomain, level, adminName },
    })

    return school
  })

  await sendWelcomeEmail({
    to: reg.email,
    schoolName: created.name,
    subdomain: created.subdomain,
    loginUrl,
  })

  const response = NextResponse.json({
    success: true,
    school: created,
    loginUrl,
  })
  response.cookies.set('onboarding_token', '', { maxAge: 0, path: '/' })
  return response
}
