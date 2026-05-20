export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}))

    const { referenceId, status, amount, provider, accountNumber } = payload

    if (!referenceId) {
      return NextResponse.json({ error: 'Missing referenceId' }, { status: 400 })
    }

    const paymentStatus = String(status || '').toLowerCase()

    if (paymentStatus === 'completed' || paymentStatus === 'success') {
      await prisma.schoolRegistration.updateMany({
        where: { paymentReference: referenceId },
        data: {
          paymentStatus: 'paid',
          paymentProvider: provider,
          planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Payment confirmed and plan activated',
        referenceId,
      })
    }

    if (paymentStatus === 'failed' || paymentStatus === 'rejected') {
      await prisma.schoolRegistration.updateMany({
        where: { paymentReference: referenceId },
        data: {
          paymentStatus: 'failed',
        },
      })

      return NextResponse.json({
        success: false,
        message: 'Payment failed',
        referenceId,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status received',
      status: paymentStatus,
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
  const referenceId = request.nextUrl.searchParams.get('referenceId')
  const status = request.nextUrl.searchParams.get('status')

  if (referenceId && status) {
    const paymentStatus = String(status).toLowerCase()

    if (paymentStatus === 'completed' || paymentStatus === 'success') {
      await prisma.schoolRegistration.updateMany({
        where: { paymentReference: referenceId },
        data: {
          paymentStatus: 'paid',
          planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      return NextResponse.redirect(
        new URL(`/onboarding?payment=success&reference=${referenceId}`, request.url)
      )
    }

    return NextResponse.redirect(
      new URL(`/onboarding?payment=failed&reference=${referenceId}`, request.url)
    )
  }

  return NextResponse.json({ success: true, message: 'Payment callback endpoint active' })
}
