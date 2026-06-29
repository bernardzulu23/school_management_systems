export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { activatePlanPayment } from '@/lib/billing/activate-plan-payment'
import { activateFeePayment } from '@/lib/payments/feePayments'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'

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

export const POST = withSecureHandler(async function POST(request) {
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

export const GET = withSecureHandler(async function GET(request) {
  const { searchParams } = new URL(request.url)
  const referenceId = safeQueryString(searchParams.get('referenceId'), { defaultValue: '' })
  const identifier = safeQueryString(searchParams.get('identifier'), { defaultValue: '' })
  const status = safeQueryString(searchParams.get('status'), { defaultValue: '' })
  const origin = new URL(request.url).origin

  if (referenceId || identifier) {
    if (isPaidLipilaStatus(status) || isFailedLipilaStatus(status)) {
      const feeResult = await activateFeePayment({
        identifier: identifier || null,
        referenceId,
        status,
      })
      if (feeResult.handled) {
        const params = new URLSearchParams({
          payment: isPaidLipilaStatus(status) ? 'success' : 'failed',
        })
        if (referenceId) params.set('referenceId', referenceId)
        return NextResponse.redirect(`${origin}/dashboard/payments?${params.toString()}`)
      }

      const result = await activatePlanPayment({
        identifier: identifier || null,
        referenceId,
        status,
      })
      if (result.type === 'school_plan_payment') {
        const params = new URLSearchParams({
          paymentReturn: '1',
          payment: isPaidLipilaStatus(status) ? 'success' : 'failed',
        })
        if (referenceId) params.set('referenceId', referenceId)
        return NextResponse.redirect(`${origin}/dashboard/billing?${params.toString()}`)
      }
    }

    const params = new URLSearchParams({
      payment: isPaidLipilaStatus(status) ? 'success' : 'failed',
    })
    if (referenceId) params.set('reference', referenceId)
    return NextResponse.redirect(`${origin}/onboarding?${params.toString()}`)
  }

  return NextResponse.json({ success: true, message: 'Payment callback endpoint active' })
})
