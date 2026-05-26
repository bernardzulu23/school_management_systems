export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { activatePlanPayment } from '@/lib/billing/activate-plan-payment'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'

function getIdentifier(payload) {
  const p = payload || {}
  return (
    String(
      p.identifier ||
        p.internalId ||
        p.internal_id ||
        p?.data?.identifier ||
        p?.data?.internalId ||
        ''
    ).trim() || null
  )
}

function getReferenceId(payload) {
  const p = payload || {}
  return (
    String(
      p.referenceId || p.reference_id || p?.data?.referenceId || p?.data?.reference_id || ''
    ).trim() || null
  )
}

function getStatus(payload) {
  return String(payload?.status || payload?.data?.status || '').trim()
}

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}))
    const identifier = getIdentifier(payload)
    const referenceId = getReferenceId(payload)
    const status = getStatus(payload)

    if (!identifier && !referenceId) {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    if (isPaidLipilaStatus(status) || isFailedLipilaStatus(status)) {
      await activatePlanPayment({ identifier, referenceId, status })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status processed',
      referenceId,
    })
  } catch (error) {
    console.error('Payment callback error:', error)
    return NextResponse.json(
      { success: false, error: 'Callback processing failed' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  const referenceId = String(request.nextUrl.searchParams.get('referenceId') || '').trim()
  const identifier = String(request.nextUrl.searchParams.get('identifier') || '').trim()
  const status = String(request.nextUrl.searchParams.get('status') || '').trim()
  const origin = new URL(request.url).origin

  if (referenceId || identifier) {
    if (isPaidLipilaStatus(status) || isFailedLipilaStatus(status)) {
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
}
