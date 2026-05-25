export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'
import { sendSchoolPortalLinkEmail } from '@/config/email'
import { trialEndsAtFromStart } from '@/lib/billing/subscription'
import {
  buildWelcomeSmsMessage,
  normalizePhoneNumbers,
  pushSmsLog,
  sendAfricasTalkingSms,
} from '@/lib/sms'
import { clearAuthSessionCookies } from '@/lib/security/cookies'

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

function planToExpiresAt(plan, months) {
  const p = String(plan || '')
    .trim()
    .toLowerCase()
  if (!['basic', 'standard', 'premium'].includes(p)) return null
  const mRaw = Number(months ?? 1)
  const m = Number.isFinite(mRaw) ? Math.max(1, Math.min(12, Math.trunc(mRaw))) : 1
  return new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000)
}

function trialEndsAt() {
  return trialEndsAtFromStart()
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
      subscriptionMonths: true,
    },
  })
  if (!reg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!reg.isVerified)
    return NextResponse.json({ error: 'Verify your email first' }, { status: 401 })
  const plan = String(reg.plan || 'basic')
    .trim()
    .toLowerCase()
  const isTrial = plan === 'trial'
  if (!isTrial && String(reg.paymentStatus || '').toLowerCase() !== 'paid') {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 })
  }

  const body = await request.json().catch(() => ({}))
  const schoolName = String(body?.schoolName || '').trim()
  const subdomain = normalizeSubdomain(body?.subdomain)
  const level = normalizeLevel(body?.level)
  const adminName = String(body?.adminName || '').trim()
  const adminPhone = body?.adminPhone ?? body?.phone ?? null

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
        ...(adminPhone ? { phone: String(adminPhone).trim() || null } : {}),
        plan,
        planExpiresAt: isTrial ? null : planToExpiresAt(plan, reg.subscriptionMonths),
        trialEndsAt: isTrial ? trialEndsAt() : null,
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
        ...(adminPhone ? { contact_number: String(adminPhone).trim() || null } : {}),
      },
      select: { id: true },
    })

    await tx.schoolRegistration.update({
      where: { id: reg.id },
      data: { schoolName, subdomain, level, adminName },
    })

    return school
  })

  await sendSchoolPortalLinkEmail({
    to: reg.email,
    schoolName: created.name,
    subdomain: created.subdomain,
    loginUrl,
    adminName,
  })

  try {
    const recipients = normalizePhoneNumbers(adminPhone)
    if (recipients.length > 0) {
      const message = buildWelcomeSmsMessage({ schoolName: created.name, loginUrl })
      const sent = await sendAfricasTalkingSms({ to: recipients, message })
      pushSmsLog({
        direction: 'out',
        schoolId: created.id,
        to: sent.recipients,
        message,
        event: 'school_welcome',
      })
    }
  } catch {}

  const response = NextResponse.json({
    success: true,
    school: created,
    loginUrl,
  })
  response.cookies.set('onboarding_token', '', { maxAge: 0, path: '/' })
  clearAuthSessionCookies(response, request)
  return response
}
