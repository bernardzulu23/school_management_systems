export const dynamic = 'force-dynamic'
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { assertFeeManagementAllowed } from '@/lib/school/feeManagementAccess'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import {
  extractGatewayReferenceId,
  isFailedLipilaStatus,
  isPaidLipilaStatus,
  LIPILA_PROVIDER_PAYMENT_TYPES,
} from '@/lib/payments/lipila'
import { activateFeePayment, serializeFeePayment } from '@/lib/payments/feePayments'

const PAYMENT_OPTION_BY_PROVIDER = {
  airtel: { label: 'Airtel Zambia', paymentType: LIPILA_PROVIDER_PAYMENT_TYPES.airtel },
  airtel_zambia: { label: 'Airtel Zambia', paymentType: LIPILA_PROVIDER_PAYMENT_TYPES.airtel },
  mtn: { label: 'MTN Zambia', paymentType: LIPILA_PROVIDER_PAYMENT_TYPES.mtn },
  mtn_zambia: { label: 'MTN Zambia', paymentType: LIPILA_PROVIDER_PAYMENT_TYPES.mtn },
  zamtel: { label: 'Zamtel', paymentType: LIPILA_PROVIDER_PAYMENT_TYPES.zamtel },
}

const HISTORY_ROLES = ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher']

function normalizeZambiaMsisdn(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('260') && digits.length >= 11) return digits
  if (digits.length === 9) return `260${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return `260${digits.slice(1)}`
  return digits
}

async function authorizeSchoolFeeAccess(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!roleCheck(auth.user, HISTORY_ROLES)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const featureBlock = await requireFeature(schoolId, 'fee-management')
  if (featureBlock) return { ok: false, response: featureBlock }

  const ownershipBlock = await assertFeeManagementAllowed(schoolId)
  if (ownershipBlock) return { ok: false, response: ownershipBlock }

  return { ok: true, auth, schoolId }
}

export async function GET(request) {
  const access = await authorizeSchoolFeeAccess(request)
  if (!access.ok) return access.response

  try {
    const payments = await prisma.schoolFeePayment.findMany({
      where: { schoolId: access.schoolId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({
      transactions: payments.map(serializeFeePayment),
    })
  } catch (error) {
    const code = String(error?.code || '')
    if (code === 'P2021' || /SchoolFeePayment/i.test(String(error?.message))) {
      return NextResponse.json({ transactions: [] })
    }
    throw error
  }
}

export async function POST(request) {
  const access = await authorizeSchoolFeeAccess(request)
  if (!access.ok) return access.response

  const { auth, schoolId } = access

  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 30 : 300,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'pay_mm_',
    keyGenerator: ({ ip }) => `${ip}-${String(auth.user?.id || '')}-${schoolId}`,
  })
  if (rl.isLimited) return rl.response

  const body = await request.json().catch(() => ({}))

  const amount = Number(body?.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const accountNumber = normalizeZambiaMsisdn(body?.accountNumber)
  if (!accountNumber) {
    return NextResponse.json({ error: 'Invalid accountNumber' }, { status: 400 })
  }

  const narration = String(body?.narration || 'ZSMS payment').trim()
  const currency = String(body?.currency || 'ZMW')
    .trim()
    .toUpperCase()
  const email = String(body?.email || auth.user?.email || '').trim()
  const paymentType = String(body?.paymentType || '').trim() || null
  const studentId = String(body?.studentId || '').trim() || null

  const providerRaw = String(body?.provider || body?.paymentOption || '')
    .trim()
    .toLowerCase()
  const providerKey = providerRaw.replace(/\s+/g, '_')
  const selectedOption = providerKey ? PAYMENT_OPTION_BY_PROVIDER[providerKey] : null
  const provider = providerKey || null

  const paymentId = crypto.randomUUID()
  const referenceId = String(body?.referenceId || crypto.randomUUID()).trim()

  const origin = request.headers.get('origin') || new URL(request.url).origin
  const callbackUrl = String(body?.callbackUrl || `${origin}/api/payments/lipila/callback`).trim()
  const backUrl = String(body?.backUrl || `${origin}/dashboard/payments`).trim()
  const redirectUrl = String(body?.redirectUrl || `${origin}/dashboard/payments`).trim()

  let paymentRecord
  try {
    paymentRecord = await prisma.schoolFeePayment.create({
      data: {
        id: paymentId,
        schoolId,
        initiatedById: auth.user?.id || null,
        amount,
        currency,
        provider,
        referenceId,
        status: 'pending',
        accountNumber,
        narration,
        paymentType,
        studentId,
      },
    })
  } catch (dbError) {
    const code = String(dbError?.code || '')
    if (code === 'P2021' || /SchoolFeePayment/i.test(String(dbError?.message))) {
      return NextResponse.json(
        {
          error:
            'Fee payments are not available until the database is updated. Run: npx prisma migrate deploy',
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
    narration,
    accountNumber,
    currency,
    backUrl,
    redirectUrl,
    email,
    ...(selectedOption ? { paymentType: selectedOption.paymentType } : {}),
  }

  const apiKey = String(process.env.LIPILA_API_KEY || process.env.LIPILA_SECRET_KEY || '').trim()
  const baseUrl = String(
    process.env.LIPILA_BASE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://blz.lipila.io' : 'https://api.lipila.dev')
  ).trim()
  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/collections/mobile-money`

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      await prisma.schoolFeePayment.update({
        where: { id: paymentId },
        data: { status: 'failed', lipilaStatus: 'not_configured' },
      })
      return NextResponse.json({ error: 'Payment gateway is not configured' }, { status: 500 })
    }

    const placeholderData = {
      currency,
      amount,
      accountNumber,
      status: 'Pending',
      paymentType: selectedOption?.paymentType || 'AirtelMoney',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      cardRedirectionUrl: null,
      createdAt: new Date().toISOString(),
    }

    const transaction = serializeFeePayment(paymentRecord)
    return NextResponse.json(
      {
        success: true,
        provider: 'lipila',
        referenceId,
        data: placeholderData,
        placeholder: true,
        transaction,
        message:
          'Payment initiated (development placeholder — configure LIPILA_API_KEY for live collections).',
      },
      { status: 200 }
    )
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'ZSMS-Server',
      },
      body: JSON.stringify(lipilaPayload),
    })
    clearTimeout(timeout)

    const contentType = String(response.headers.get('content-type') || '')
    const raw = await response.text().catch(() => '')
    let data = {}
    if (raw && contentType.includes('application/json')) {
      data = JSON.parse(raw)
    } else if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = { raw }
      }
    }

    if (!response.ok) {
      await prisma.schoolFeePayment.update({
        where: { id: paymentId },
        data: { status: 'failed', lipilaStatus: String(data?.status || 'gateway_error') },
      })

      const rawMessage =
        typeof data?.message === 'string'
          ? data.message
          : typeof data?.error === 'string'
            ? data.error
            : typeof data?.raw === 'string'
              ? data.raw
              : ''

      const looksLikeBotGate =
        typeof rawMessage === 'string' &&
        (rawMessage.includes('Performing security verification') ||
          rawMessage.includes('Just a moment') ||
          rawMessage.includes('<html') ||
          rawMessage.includes('<!doctype html'))

      const msg = looksLikeBotGate
        ? 'Payment gateway is blocked by security verification. Disable bot protection for the gateway endpoint or whitelist server-to-server requests.'
        : typeof rawMessage === 'string' && rawMessage.trim()
          ? rawMessage.trim()
          : 'Payment request failed'

      return NextResponse.json(
        { error: msg, upstreamStatus: response.status, upstreamContentType: contentType },
        { status: 502 }
      )
    }

    const gatewayReferenceId = extractGatewayReferenceId(data) || referenceId
    const lipilaStatus = String(data?.status || '').trim()

    if (gatewayReferenceId !== referenceId) {
      paymentRecord = await prisma.schoolFeePayment.update({
        where: { id: paymentId },
        data: { referenceId: gatewayReferenceId, lipilaStatus },
      })
    } else if (lipilaStatus) {
      paymentRecord = await prisma.schoolFeePayment.update({
        where: { id: paymentId },
        data: { lipilaStatus },
      })
    }

    if (isPaidLipilaStatus(lipilaStatus) || isFailedLipilaStatus(lipilaStatus)) {
      await activateFeePayment({
        identifier: paymentId,
        referenceId: gatewayReferenceId,
        status: lipilaStatus,
      })
      paymentRecord = await prisma.schoolFeePayment.findUnique({ where: { id: paymentId } })
    }

    const transaction = serializeFeePayment(paymentRecord)
    return NextResponse.json(
      {
        success: true,
        provider: 'lipila',
        referenceId: gatewayReferenceId,
        lipilaStatus,
        data,
        transaction,
        message:
          lipilaStatus.toLowerCase() === 'pending'
            ? 'Check your phone and enter your mobile money PIN to approve the payment.'
            : isPaidLipilaStatus(lipilaStatus)
              ? 'Payment completed successfully.'
              : 'Payment request sent.',
      },
      { status: 200 }
    )
  } catch (error) {
    await prisma.schoolFeePayment.update({
      where: { id: paymentId },
      data: { status: 'failed', lipilaStatus: 'gateway_unavailable' },
    })
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Payment gateway timeout' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Payment gateway unavailable' }, { status: 502 })
  }
}
