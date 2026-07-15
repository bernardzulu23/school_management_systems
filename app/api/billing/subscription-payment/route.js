export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getPlanMonthlyPrice } from '@/lib/billing/plan-pricing'
import {
  extractGatewayReferenceId,
  getLipilaConfig,
  LIPILA_PROVIDER_PAYMENT_TYPES,
  lipilaCreateMobileMoneyCollection,
} from '@/lib/payments/lipila'

function normalizeZambiaMsisdn(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('260') && digits.length >= 11) return digits
  if (digits.length === 9) return `260${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return `260${digits.slice(1)}`
  return digits
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    const schoolMeta = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolType: true, ownerUserId: true },
    })
    const canIndividualUpgrade =
      schoolMeta?.schoolType === 'INDIVIDUAL' &&
      schoolMeta.ownerUserId === auth.user?.id &&
      roleCheck(auth.user, ['TEACHER', 'teacher'])
    if (!canIndividualUpgrade) {
      return NextResponse.json(
        { error: 'Only school admins can upgrade the plan' },
        { status: 403 }
      )
    }
  }

  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 10 : 60,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'billing_pay_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}`,
  })
  if (rl.isLimited) return rl.response

  const body = await request.json().catch(() => ({}))
  const plan = String(body?.plan || '')
    .trim()
    .toLowerCase()
  const provider = String(body?.provider || '')
    .trim()
    .toLowerCase()
  const accountNumber = normalizeZambiaMsisdn(body?.accountNumber)
  const monthsRaw = Number(body?.months ?? 1)
  const months = Number.isFinite(monthsRaw) ? Math.trunc(monthsRaw) : 1

  const monthly = getPlanMonthlyPrice(plan)
  if (!monthly) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  if (!LIPILA_PROVIDER_PAYMENT_TYPES[provider]) {
    return NextResponse.json({ error: 'Invalid mobile money provider' }, { status: 400 })
  }
  if (!accountNumber) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }
  if (months < 1 || months > 12) {
    return NextResponse.json({ error: 'Invalid months (1–12)' }, { status: 400 })
  }

  const { apiKey } = getLipilaConfig()
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Mobile money payments are not configured. Contact support or set LIPILA_API_KEY on the server.',
      },
      { status: 503 }
    )
  }

  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: { name: true, email: true },
  })
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const amount = monthly * months
  const paymentId = crypto.randomUUID()
  const referenceId = crypto.randomUUID()

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const proto =
    request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const origin = host
    ? `${proto}://${host}`
    : request.headers.get('origin') || new URL(request.url).origin

  const callbackUrl = `${origin}/api/payments/lipila/callback`
  const redirectUrl = `${origin}/dashboard/billing?paymentReturn=1`

  let paymentRecord
  try {
    paymentRecord = await prisma.schoolPlanPayment.create({
      data: {
        id: paymentId,
        schoolId,
        plan,
        months,
        amount,
        provider,
        referenceId,
        status: 'pending',
      },
    })
  } catch (dbError) {
    const code = String(dbError?.code || '')
    if (code === 'P2021' || /SchoolPlanPayment/i.test(String(dbError?.message))) {
      return NextResponse.json(
        {
          error:
            'Billing upgrade is not available until the database is updated. Run: npx prisma db push',
        },
        { status: 503 }
      )
    }
    throw dbError
  }

  const lipilaPayload = {
    callbackUrl,
    referenceId,
    identifier: paymentRecord.id,
    amount,
    narration: `ZSMS ${plan} plan (${months} mo)`,
    accountNumber,
    currency: 'ZMW',
    backUrl: redirectUrl,
    redirectUrl,
    email: String(auth.user?.email || school.email || '').trim() || undefined,
    paymentType: LIPILA_PROVIDER_PAYMENT_TYPES[provider],
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    const result = await lipilaCreateMobileMoneyCollection(lipilaPayload, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!result.ok) {
      await prisma.schoolPlanPayment.updateMany({
        where: { id: paymentId, schoolId },
        data: { status: 'failed' },
      })
      return NextResponse.json({ error: result.error || 'Payment request failed' }, { status: 502 })
    }

    const data = result.data || {}
    const gatewayReferenceId = extractGatewayReferenceId(data)
    if (gatewayReferenceId && gatewayReferenceId !== referenceId) {
      await prisma.schoolPlanPayment.updateMany({
        where: { id: paymentId, schoolId },
        data: { referenceId: gatewayReferenceId },
      })
    }

    const lipilaStatus = String(data?.status || '').trim()
    return NextResponse.json({
      success: true,
      referenceId: gatewayReferenceId || referenceId,
      lipilaStatus,
      message:
        lipilaStatus.toLowerCase() === 'pending'
          ? 'Check your phone and enter your mobile money PIN to approve the payment.'
          : data?.message || 'Payment request sent',
    })
  } catch (error) {
    await prisma.schoolPlanPayment.updateMany({
      where: { id: paymentId, schoolId },
      data: { status: 'failed' },
    })
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Payment gateway timeout' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Payment gateway unavailable' }, { status: 502 })
  }
})
