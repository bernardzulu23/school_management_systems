export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { activatePlanPayment } from '@/lib/billing/activate-plan-payment'
import { activateFeePayment } from '@/lib/payments/feePayments'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import { unauthorizedWebhookResponse, verifySharedWebhookSecret } from '@/lib/security/webhookAuth'

function getIdentifier(payload) {
  const p = payload || {}
  const raw =
    p.identifier ||
    p.internalId ||
    p.internal_id ||
    p?.data?.identifier ||
    p?.data?.internalId ||
    p?.data?.internal_id ||
    null
  return safeStringId(raw)
}

function getReferenceId(payload) {
  const p = payload || {}
  const raw =
    p.referenceId || p.reference_id || p?.data?.referenceId || p?.data?.reference_id || null
  return safeStringId(raw, { maxLength: 256 })
}

function getStatus(payload) {
  return String(payload?.status || payload?.data?.status || '').trim()
}

function assertLipilaWebhook(request) {
  return verifySharedWebhookSecret(request, 'LIPILA_WEBHOOK_SECRET', {
    aliasHeaders: ['x-lipila-webhook-secret'],
  })
}

export const POST = withSecureHandler(async function POST(request) {
  const auth = assertLipilaWebhook(request)
  if (!auth.ok) return unauthorizedWebhookResponse(auth)

  const payload = await request.json().catch(() => ({}))
  const identifier = getIdentifier(payload)
  const referenceId = getReferenceId(payload)
  const status = getStatus(payload)

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

  // Prefer billing return; fee returns still land on payments if client used that redirectUrl.
  const hint = safeQueryString(searchParams.get('returnTo'), { defaultValue: '' })
  if (hint === 'payments') {
    return NextResponse.redirect(`${origin}/dashboard/payments?${params.toString()}`)
  }
  return NextResponse.redirect(`${origin}/dashboard/billing?${params.toString()}`)
})
