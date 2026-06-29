export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { sendOnboardingVerificationEmail } from '@/config/email'
import { signOnboardingToken } from '@/lib/middleware/onboardingAuth'
import { getOnboardingVerifyUrl } from '@/lib/onboarding/emailLinks'
import { INDIVIDUAL_PLANS } from '@/lib/onboarding/individual'
import { normalizePhoneNumbers } from '@/lib/sms'
import { passwordPolicyError } from '@/lib/security/passwordPolicy'
import { withSecureHandler } from '@/lib/middleware/secureApi'

function isValidEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const POST = withSecureHandler(async function POST(request) {
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
    const adminPhoneRaw = String(body?.adminPhone ?? body?.phone ?? '').trim()
    const schoolType = String(body?.schoolType || 'SCHOOL').toUpperCase()
    const accountType = String(body?.accountType || 'teacher').toLowerCase()

    if (schoolType === 'INDIVIDUAL' && accountType === 'student') {
      return NextResponse.json(
        {
          error:
            'Independent student signup is not available. Use a school portal or solo teacher workspace.',
        },
        { status: 400 }
      )
    }
    const requestedPlan = String(body?.plan || '')
      .trim()
      .toLowerCase()

    const validSchoolPlans =
      requestedPlan === 'trial' ||
      requestedPlan === 'basic' ||
      requestedPlan === 'standard' ||
      requestedPlan === 'premium'
    const validIndividualPlans = INDIVIDUAL_PLANS.has(requestedPlan)
    const defaultIndividualPlan = schoolType === 'INDIVIDUAL' ? 'individual' : null

    let plan = null
    if (schoolType === 'INDIVIDUAL') {
      plan = validIndividualPlans ? requestedPlan : defaultIndividualPlan
    } else if (validSchoolPlans) {
      plan = requestedPlan
    }
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    const policyError = passwordPolicyError(password)
    if (policyError) {
      return NextResponse.json({ error: policyError, code: 'WEAK_PASSWORD' }, { status: 400 })
    }

    const existing = await prisma.schoolRegistration.findUnique({ where: { email } })
    const existingStatus = String(existing?.paymentStatus || '')
      .trim()
      .toLowerCase()
    const isPortalCreated = Boolean(
      existing?.schoolName && existing?.subdomain && existing?.adminName
    )
    const existingPlan = String(existing?.plan || '')
      .trim()
      .toLowerCase()
    const requested = String(plan || '')
      .trim()
      .toLowerCase()

    const isPaid = existingStatus === 'paid'
    const allowTrialOverride = requested === 'trial' && !isPaid
    const canChangePlan =
      !existing || allowTrialOverride || existingStatus === 'unpaid' || !existingStatus
    const finalPlan = canChangePlan && requested ? requested : existingPlan || requested || null
    const isTrial = finalPlan === 'trial'
    const normalizedFinal = String(finalPlan || '').toLowerCase()
    const skipPayment = isTrial || schoolType === 'INDIVIDUAL'

    if (existing?.isVerified && isPortalCreated && (isTrial || existingStatus === 'paid')) {
      const baseDomain = String(
        process.env.BASE_DOMAIN || process.env.COOKIE_DOMAIN || 'bluepeacktechnologies.com'
      )
        .trim()
        .replace(/^\./, '')
      const isLocal = baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1')
      const loginUrl = isLocal ? `/login` : `https://${existing.subdomain}.${baseDomain}/login`
      return NextResponse.json({ success: true, alreadyCompleted: true, loginUrl }, { status: 200 })
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
    const adminPhoneNormalized = normalizePhoneNumbers(adminPhoneRaw)
    const adminPhone = adminPhoneNormalized[0] || (adminPhoneRaw ? adminPhoneRaw : null)

    if (adminPhoneRaw && !adminPhone) {
      return NextResponse.json(
        { error: 'Enter a valid Zambian mobile number (+2607… or +2609…)', code: 'INVALID_PHONE' },
        { status: 400 }
      )
    }

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
        paymentStatus: 'unpaid',
        schoolType,
        accountType: schoolType === 'INDIVIDUAL' ? 'teacher' : accountType,
        ...(adminPhone ? { adminPhone } : {}),
        ...(finalPlan ? { plan: finalPlan } : {}),
        ...(finalPlan ? { subscriptionMonths: 1 } : {}),
      },
      update: {
        passwordHash,
        isVerified: existing?.isVerified || false,
        verificationToken: existing?.isVerified ? existing.verificationToken : verificationToken,
        verificationExpiry: existing?.isVerified ? existing.verificationExpiry : verificationExpiry,
        lastVerificationSentAt: existing?.isVerified
          ? existing.lastVerificationSentAt
          : lastVerificationSentAt,
        paymentStatus: skipPayment ? 'unpaid' : existing?.paymentStatus || 'unpaid',
        plan: finalPlan,
        schoolType,
        accountType: schoolType === 'INDIVIDUAL' ? 'teacher' : accountType,
        ...(adminPhone ? { adminPhone } : {}),
        subscriptionMonths: existing?.subscriptionMonths || 1,
        ...(skipPayment
          ? {
              paymentProvider: null,
              paymentReference: null,
            }
          : {}),
      },
      select: { id: true },
    })

    if (!existing?.isVerified) {
      const verifyUrl = getOnboardingVerifyUrl(request, verificationToken)
      const sent = await sendOnboardingVerificationEmail({ to: email, verifyUrl })
      if (!sent) {
        if (process.env.DEV_ONBOARDING_SKIP_EMAIL === 'true') {
          await prisma.schoolRegistration.update({
            where: { id: reg.id },
            data: {
              isVerified: true,
              verificationToken: null,
              verificationExpiry: null,
            },
          })
          const onboardingToken = signOnboardingToken(reg.id)
          const response = NextResponse.json({
            success: true,
            requiresVerification: false,
            devAutoVerified: true,
            requiresPayment: !skipPayment,
            nextStep: !skipPayment ? 'plan' : 'setup',
          })
          response.cookies.set('onboarding_token', onboardingToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 2 * 24 * 60 * 60,
            path: '/',
          })
          return response
        }
        return NextResponse.json(
          {
            error:
              'We could not send the verification email. Check that RESEND_API_KEY and EMAIL_FROM are set, or use Resend to verify your domain.',
            code: 'EMAIL_NOT_SENT',
          },
          { status: 502 }
        )
      }
      const response = NextResponse.json({
        success: true,
        requiresVerification: true,
        schoolType,
        ...(isTrial ? { trialIntent: true } : {}),
        requiresPayment: schoolType !== 'INDIVIDUAL' && !skipPayment,
      })
      response.cookies.set('onboarding_token', '', { maxAge: 0, path: '/' })
      return response
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

    const requiresPayment = !skipPayment && existingStatus !== 'paid'

    const response = NextResponse.json({
      success: true,
      alreadyVerified: true,
      requiresPayment,
      schoolType,
      nextStep: requiresPayment ? 'plan' : 'setup',
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
    const raw = String(error?.message || error || '')
    const missingTables =
      raw.includes('P2021') ||
      raw.toLowerCase().includes('does not exist') ||
      raw.includes('relation')
    if (missingTables) {
      return NextResponse.json(
        { error: 'Database tables are missing. Run migrations on the production database.' },
        { status: 503 }
      )
    }

    const dbDown =
      raw.includes('P1001') ||
      raw.toLowerCase().includes("can't reach database server") ||
      raw.toLowerCase().includes('connection') ||
      raw.toLowerCase().includes('timeout')
    if (dbDown) {
      return NextResponse.json(
        { error: 'Database is unavailable. Try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to start onboarding',
        ...(process.env.NODE_ENV === 'development' ? { details: raw } : {}),
      },
      { status: 500 }
    )
  }
})
