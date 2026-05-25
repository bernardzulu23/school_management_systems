export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'
import { syncOnboardingPaymentFromLipila } from '@/lib/payments/lipila'

export async function GET(request) {
  const token = request.cookies.get('onboarding_token')?.value || ''
  const registrationId = verifyOnboardingToken(token)
  if (!registrationId) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }

  const { searchParams } = new URL(request.url)
  const syncPayment = searchParams.get('syncPayment') === '1' || searchParams.get('sync') === '1'

  let reg = await prisma.schoolRegistration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      email: true,
      isVerified: true,
      plan: true,
      subscriptionMonths: true,
      paymentStatus: true,
      paymentProvider: true,
      paymentReference: true,
      schoolName: true,
      subdomain: true,
      level: true,
      adminName: true,
    },
  })

  if (!reg) return NextResponse.json({ authenticated: false }, { status: 200 })

  const plan = String(reg.plan || '')
    .trim()
    .toLowerCase()
  const shouldSync =
    syncPayment &&
    plan !== 'trial' &&
    String(reg.paymentStatus || '').toLowerCase() !== 'paid' &&
    Boolean(reg.paymentReference)

  if (shouldSync) {
    await syncOnboardingPaymentFromLipila(reg)
    reg = await prisma.schoolRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        plan: true,
        subscriptionMonths: true,
        paymentStatus: true,
        paymentProvider: true,
        paymentReference: true,
        schoolName: true,
        subdomain: true,
        level: true,
        adminName: true,
      },
    })
  }

  const paymentStatus = String(reg?.paymentStatus || '').toLowerCase()
  const canCompleteSetup =
    Boolean(reg?.isVerified) && (plan === 'trial' || paymentStatus === 'paid')

  return NextResponse.json(
    {
      authenticated: true,
      registration: reg,
      canCompleteSetup,
    },
    { status: 200 }
  )
}
