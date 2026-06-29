export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'
import { sendSchoolPortalLinkEmail } from '@/config/email'
import { notifyOnboardingComplete } from '@/lib/onboarding/notifyOnboardingComplete'
import { trialEndsAtFromStart } from '@/lib/billing/subscription'
import {
  buildWelcomeSmsMessage,
  getOnboardingSmsFrom,
  normalizePhoneNumbers,
  pushSmsLog,
  sendAfricasTalkingSms,
} from '@/lib/sms'
import { clearAuthSessionCookies } from '@/lib/security/cookies'
import { logger, captureError } from '@/lib/utils/logger'
import { validateSchoolLocation } from '@/lib/platform/reportingStream'
import { completeIndividualOnboarding, isIndividualRegistration } from '@/lib/onboarding/individual'
import { seedSubjectsForSchool } from '@/lib/subjects/seedSubjects'
import { withSecureHandler } from '@/lib/middleware/secureApi'

const RESERVED = new Set([
  'www',
  'admin',
  'api',
  'dashboard',
  'app',
  'login',
  'register',
  'onboarding',
  'join',
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

function normalizeOwnershipType(value) {
  const key = String(value || 'PRIVATE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z_]/g, '')
  if (['PRIVATE', 'GOVERNMENT', 'COMMUNITY', 'GRANT_AIDED'].includes(key)) return key
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

export const POST = withSecureHandler(async function POST(request) {
  const route = '/api/onboarding/complete'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)
  let registrationId = null

  try {
    const token = request.cookies.get('onboarding_token')?.value || ''
    registrationId = verifyOnboardingToken(token)
    if (!registrationId) {
      log.response(401, Date.now() - start)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        schoolType: true,
        accountType: true,
        adminName: true,
        adminPhone: true,
      },
    })
    if (!reg) {
      log.response(401, Date.now() - start)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!reg.isVerified) {
      log.response(403, Date.now() - start)
      return NextResponse.json(
        { error: 'Verify your email first', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 }
      )
    }
    const plan = String(reg.plan || 'basic')
      .trim()
      .toLowerCase()
    const isTrial = plan === 'trial'
    const isIndividual = isIndividualRegistration(reg)

    if (isIndividual) {
      // 2-month trial at signup — payment collected via billing after trial ends
    } else if (!isTrial && String(reg.paymentStatus || '').toLowerCase() !== 'paid') {
      log.response(402, Date.now() - start)
      return NextResponse.json({ error: 'Payment required' }, { status: 402 })
    }

    const body = await request.json().catch(() => ({}))

    const baseDomain = String(
      process.env.BASE_DOMAIN || process.env.COOKIE_DOMAIN || 'bluepeacktechnologies.com'
    )
      .trim()
      .replace(/^\./, '')
    const isLocal = baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1')

    if (isIndividual) {
      const adminName = String(body?.adminName || reg.adminName || '').trim()
      const adminPhone = body?.adminPhone ?? body?.phone ?? reg.adminPhone ?? null
      if (!adminName || adminName.length < 2) {
        return NextResponse.json({ error: 'Your name is required' }, { status: 400 })
      }

      const result = await completeIndividualOnboarding({
        prisma,
        reg,
        adminName,
        adminPhone,
        baseDomain,
        isLocal,
      })

      const portalEmailSent = await sendSchoolPortalLinkEmail({
        to: reg.email,
        schoolName: result.school.name,
        subdomain: result.school.subdomain,
        loginUrl: result.loginUrl,
        adminName,
      })
      if (!portalEmailSent && process.env.DEV_ONBOARDING_SKIP_EMAIL !== 'true') {
        return NextResponse.json(
          {
            error: 'Workspace created, but portal email was not sent.',
            code: 'EMAIL_NOT_SENT',
            school: result.school,
            loginUrl: result.loginUrl,
          },
          { status: 502 }
        )
      }

      await notifyOnboardingComplete({
        route,
        schoolId: result.school.id,
        schoolName: result.school.name,
        subdomain: result.school.subdomain,
        schoolType: 'INDIVIDUAL',
        plan: reg.plan || 'individual',
        adminName,
        adminEmail: reg.email,
        adminPhone: adminPhone ? String(adminPhone).trim() : null,
        level: 'secondary',
        province: 'Lusaka',
        district: 'Lusaka',
        loginUrl: result.loginUrl,
      })

      const response = NextResponse.json({
        success: true,
        school: result.school,
        loginUrl: result.loginUrl,
        redirectUrl: result.redirectUrl,
      })
      response.cookies.set('onboarding_token', '', { maxAge: 0, path: '/' })
      clearAuthSessionCookies(response, request)
      logger({ route, schoolId: result.school.id }).response(200, Date.now() - start)
      return response
    }

    const schoolName = String(body?.schoolName || '').trim()
    const subdomain = normalizeSubdomain(body?.subdomain)
    const level = normalizeLevel(body?.level)
    const ownershipType = normalizeOwnershipType(body?.ownershipType) || 'PRIVATE'
    const adminName = String(body?.adminName || '').trim()
    const adminPhone = body?.adminPhone ?? body?.phone ?? reg.adminPhone ?? null
    const location = validateSchoolLocation({
      province: body?.province,
      district: body?.district,
    })
    if (!location.ok) {
      return NextResponse.json({ error: location.error }, { status: 400 })
    }
    const { province, district, reportingStreamKey } = location

    if (!schoolName || schoolName.length < 2) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 })
    }
    if (!subdomain || subdomain.length < 3) {
      return NextResponse.json(
        { error: 'Subdomain must be at least 3 characters' },
        { status: 400 }
      )
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
          ownershipType,
          province,
          district,
          reportingStreamKey,
          active: true,
          emailVerified: true,
        },
        select: { id: true, name: true, subdomain: true },
      })

      const headteacher = await tx.user.create({
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

      await tx.school.update({
        where: { id: school.id },
        data: { ownerUserId: headteacher.id },
      })

      await tx.schoolRegistration.update({
        where: { id: reg.id },
        data: { schoolName, subdomain, level, adminName, province, district, reportingStreamKey },
      })

      await seedSubjectsForSchool(tx, { id: school.id, level, enabledLocalLanguages: [] })

      return school
    })

    const portalEmailSent = await sendSchoolPortalLinkEmail({
      to: reg.email,
      schoolName: created.name,
      subdomain: created.subdomain,
      loginUrl,
      adminName,
    })
    if (!portalEmailSent && process.env.DEV_ONBOARDING_SKIP_EMAIL !== 'true') {
      return NextResponse.json(
        {
          error:
            'School created, but portal email was not sent. Check RESEND_API_KEY and EMAIL_FROM_NOREPLY.',
          code: 'EMAIL_NOT_SENT',
          school: created,
          loginUrl,
        },
        { status: 502 }
      )
    }

    await notifyOnboardingComplete({
      route,
      schoolId: created.id,
      schoolName: created.name,
      subdomain: created.subdomain,
      schoolType: 'SCHOOL',
      plan,
      adminName,
      adminEmail: reg.email,
      adminPhone: adminPhone ? String(adminPhone).trim() : null,
      level,
      province,
      district,
      loginUrl,
    })

    try {
      const recipients = normalizePhoneNumbers(adminPhone)
      if (recipients.length > 0) {
        const message = buildWelcomeSmsMessage({ schoolName: created.name, loginUrl })
        const sent = await sendAfricasTalkingSms({
          to: recipients,
          message,
          from: getOnboardingSmsFrom(),
        })
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
    logger({ route, schoolId: created.id }).response(200, Date.now() - start)
    return response
  } catch (error) {
    captureError(error, { route, registrationId: registrationId || undefined })
    log.response(500, Date.now() - start)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
})
