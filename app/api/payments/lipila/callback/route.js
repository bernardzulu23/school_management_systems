export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { activatePlanPayment } from '@/lib/billing/activate-plan-payment'
import { activateFeePayment } from '@/lib/payments/feePayments'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import {
  parseLipilaCallbackPayload,
  verifyLipilaWebhookRequest,
} from '@/lib/payments/lipilaCallback'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { unauthorizedWebhookResponse } from '@/lib/security/webhookAuth'
import { recordPaymentWebhookFailureAlert } from '@/lib/observability/alerts'
import { captureError } from '@/lib/utils/logger'

export const POST = withSecureHandler(async function POST(request) {
  const rawBody = await request.text().catch(() => '')
  const auth = verifyLipilaWebhookRequest(request, rawBody)
  if (!auth.ok) {
    recordPaymentWebhookFailureAlert({ kind: 'lipila', reason: auth.error || 'unauthorized' })
    return unauthorizedWebhookResponse(auth)
  }

  let payload = {}
  try {
    payload = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    recordPaymentWebhookFailureAlert({ kind: 'lipila', reason: 'invalid_json' })
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseLipilaCallbackPayload(payload)
  if (!parsed.ok) {
    recordPaymentWebhookFailureAlert({ kind: 'lipila', reason: parsed.error || 'parse_failed' })
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
  }

  const { identifier, referenceId, status, amount, currency, eventId } = parsed

  if (!identifier && !referenceId) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  try {
    if (isPaidLipilaStatus(status) || isFailedLipilaStatus(status)) {
      const feeResult = await activateFeePayment({
        identifier,
        referenceId,
        status,
        amount,
        currency,
        eventId,
      })
      if (!feeResult.handled) {
        await activatePlanPayment({
          identifier,
          referenceId,
          status,
          amount,
          currency,
          eventId,
        })
      }
    }
  } catch (error) {
    recordPaymentWebhookFailureAlert({ kind: 'lipila', reason: 'handler_exception' })
    captureError(error, { route: '/api/payments/lipila/callback' })
    throw error
  }

  return NextResponse.json({
    success: true,
    message: 'Payment status processed',
    referenceId,
  })
})

/**
 * Browser return URL only — never activate payments from query-string status.
 */
export const GET = withSecureHandler(async function GET(request) {
  const { searchParams } = new URL(request.url)
  const referenceId = safeQueryString(searchParams.get('referenceId'), { defaultValue: '' })
  const origin = new URL(request.url).origin

  const params = new URLSearchParams({ paymentReturn: '1' })
  if (referenceId) params.set('referenceId', referenceId)

  const hint = safeQueryString(searchParams.get('returnTo'), { defaultValue: '' })
  if (hint === 'payments') {
    return NextResponse.redirect(`${origin}/dashboard/payments?${params.toString()}`)
  }
  return NextResponse.redirect(`${origin}/dashboard/billing?${params.toString()}`)
})
