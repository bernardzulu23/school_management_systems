export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { activatePlanPayment } from '@/lib/billing/activate-plan-payment'
import { activateFeePayment } from '@/lib/payments/feePayments'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import { parseLipilaCallbackPayload } from '@/lib/payments/lipilaCallback'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { unauthorizedWebhookResponse, verifySharedWebhookSecret } from '@/lib/security/webhookAuth'

function assertLipilaWebhook(request) {
  return verifySharedWebhookSecret(request, 'LIPILA_WEBHOOK_SECRET', {
    aliasHeaders: ['x-lipila-webhook-secret'],
  })
}

export const POST = withSecureHandler(async function POST(request) {
  const auth = assertLipilaWebhook(request)
  if (!auth.ok) return unauthorizedWebhookResponse(auth)

  const payload = await request.json().catch(() => ({}))
  const parsed = parseLipilaCallbackPayload(payload)
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
  }

  const { identifier, referenceId, status } = parsed

  if (!identifier && !referenceId) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  if (isPaidLipilaStatus(status) || isFailedLipilaStatus(status)) {
    const feeResult = await activateFeePayment({ identifier, referenceId, status })
    if (!feeResult.handled) {
      await activatePlanPayment({ identifier, referenceId, status })
    }
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
