export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import {
  parseLipilaCallbackPayload,
  verifyLipilaWebhookRequest,
} from '@/lib/payments/lipilaCallback'
import {
  LEDGER_ACTIONS,
  appendPaymentLedger,
  isTerminalPaidStatus,
} from '@/lib/payments/paymentLedger'
import { logger, captureError } from '@/lib/utils/logger'
import { safeStringId } from '@/lib/security/safeQueryValue'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { unauthorizedWebhookResponse } from '@/lib/security/webhookAuth'
import { recordPaymentWebhookFailureAlert } from '@/lib/observability/alerts'

async function markRegistrationPaid({ identifier, referenceId, eventId, status }) {
  const where = identifier
    ? { id: identifier }
    : referenceId
      ? { paymentReference: referenceId }
      : null
  if (!where) return

  const reg = await prisma.schoolRegistration.findFirst({
    where,
    select: { id: true, paymentStatus: true, paymentReference: true },
  })
  if (!reg) return

  if (isTerminalPaidStatus(reg.paymentStatus)) {
    await appendPaymentLedger({
      paymentKind: 'registration',
      paymentId: reg.id,
      referenceId: referenceId || reg.paymentReference,
      action: LEDGER_ACTIONS.DUPLICATE,
      lipilaStatus: status,
      eventKey: `lipila:registration:${reg.id}:DUPLICATE:${eventId || referenceId || status}`,
    })
    return
  }

  await appendPaymentLedger({
    paymentKind: 'registration',
    paymentId: reg.id,
    referenceId: referenceId || reg.paymentReference,
    action: LEDGER_ACTIONS.PAID,
    lipilaStatus: status,
    eventKey: `lipila:registration:${reg.id}:PAID:${eventId || referenceId || status}`,
  })

  await prisma.schoolRegistration.updateMany({
    where: { id: reg.id, paymentStatus: { not: 'paid' } },
    data: {
      paymentStatus: 'paid',
      ...(referenceId ? { paymentReference: referenceId } : {}),
    },
  })
}

async function markRegistrationFailed({ identifier, referenceId, eventId, status }) {
  const where = identifier
    ? { id: identifier }
    : referenceId
      ? { paymentReference: referenceId }
      : null
  if (!where) return

  const reg = await prisma.schoolRegistration.findFirst({
    where,
    select: { id: true, paymentStatus: true, paymentReference: true },
  })
  if (!reg) return

  if (isTerminalPaidStatus(reg.paymentStatus)) {
    await appendPaymentLedger({
      paymentKind: 'registration',
      paymentId: reg.id,
      referenceId: referenceId || reg.paymentReference,
      action: LEDGER_ACTIONS.REJECTED_STATUS,
      lipilaStatus: status,
      eventKey: `lipila:registration:${reg.id}:REJECTED_STATUS:${eventId || referenceId || status}`,
      metadata: { note: 'refuse_paid_to_failed' },
    })
    return
  }

  await appendPaymentLedger({
    paymentKind: 'registration',
    paymentId: reg.id,
    referenceId: referenceId || reg.paymentReference,
    action: LEDGER_ACTIONS.FAILED,
    lipilaStatus: status,
    eventKey: `lipila:registration:${reg.id}:FAILED:${eventId || referenceId || status}`,
  })

  await prisma.schoolRegistration.updateMany({
    where: { id: reg.id, paymentStatus: { not: 'paid' } },
    data: { paymentStatus: 'failed' },
  })
}

export const POST = withSecureHandler(async function POST(request) {
  const route = '/api/onboarding/lipila/callback'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

  const rawBody = await request.text().catch(() => '')
  const auth = verifyLipilaWebhookRequest(request, rawBody)
  if (!auth.ok) {
    recordPaymentWebhookFailureAlert({
      kind: 'lipila_onboarding',
      reason: auth.error || 'unauthorized',
    })
    log.response(auth.status, Date.now() - start)
    return unauthorizedWebhookResponse(auth)
  }

  try {
    let payload = {}
    try {
      payload = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      recordPaymentWebhookFailureAlert({ kind: 'lipila_onboarding', reason: 'invalid_json' })
      log.response(400, Date.now() - start)
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = parseLipilaCallbackPayload(payload)
    if (!parsed.ok) {
      recordPaymentWebhookFailureAlert({
        kind: 'lipila_onboarding',
        reason: parsed.error || 'parse_failed',
      })
      log.response(400, Date.now() - start)
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    }

    const { identifier, referenceId, status, eventId } = parsed
    if (!identifier && !referenceId) {
      log.response(200, Date.now() - start)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const ctx = logger({ route, registrationId: identifier || undefined })
    if (isPaidLipilaStatus(status)) {
      await markRegistrationPaid({ identifier, referenceId, eventId, status })
      ctx.info('Payment marked paid', { referenceId, status })
    } else if (isFailedLipilaStatus(status)) {
      await markRegistrationFailed({ identifier, referenceId, eventId, status })
      ctx.warn('Payment marked failed', { referenceId, status })
    }

    log.response(200, Date.now() - start)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    recordPaymentWebhookFailureAlert({ kind: 'lipila_onboarding', reason: 'handler_exception' })
    captureError(error, { route })
    log.response(500, Date.now() - start)
    return NextResponse.json({ success: false }, { status: 500 })
  }
})

/**
 * Browser return URL only — never trust query status to mutate payment state.
 */
export const GET = withSecureHandler(async function GET(request) {
  const route = '/api/onboarding/lipila/callback'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

  try {
    const { searchParams } = new URL(request.url)
    const referenceId = safeStringId(searchParams.get('referenceId'), { maxLength: 256 })

    log.response(302, Date.now() - start)
    const origin = new URL(request.url).origin
    const params = new URLSearchParams({ step: 'plan', paymentReturn: '1' })
    if (referenceId) params.set('referenceId', referenceId)
    return NextResponse.redirect(`${origin}/onboarding?${params.toString()}`)
  } catch (error) {
    captureError(error, { route })
    log.response(500, Date.now() - start)
    return NextResponse.json({ success: false }, { status: 500 })
  }
})
