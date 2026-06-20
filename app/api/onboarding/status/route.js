export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'
import {
  syncOnboardingPaymentFromLipila,
  checkPaymentStatusWithRetry,
  isPaidLipilaStatus,
  isFailedLipilaStatus,
  extractLipilaStatus,
  lipilaCheckCollectionStatus,
} from '@/lib/payments/lipila'

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
      adminPhone: true,
      schoolType: true,
      accountType: true,
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
    const deepSync = searchParams.get('deepSync') === '1'
    if (deepSync && reg.paymentReference) {
      const outcome = await checkPaymentStatusWithRetry(reg.paymentReference)
      if (outcome === 'paid' || outcome === 'failed') {
        await syncOnboardingPaymentFromLipila(reg)
      } else if (outcome === 'pending') {
        const quick = await lipilaCheckCollectionStatus(reg.paymentReference)
        if (quick.ok) {
          const st = extractLipilaStatus(quick.data)
          if (isPaidLipilaStatus(st) || isFailedLipilaStatus(st)) {
            await syncOnboardingPaymentFromLipila(reg)
          }
        }
      }
    } else {
      await syncOnboardingPaymentFromLipila(reg)
    }
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
        adminPhone: true,
        schoolType: true,
        accountType: true,
      },
    })
  }

  const paymentStatus = String(reg?.paymentStatus || '').toLowerCase()
  const currentPlan = String(reg?.plan || '')
    .trim()
    .toLowerCase()
  const isIndividual = String(reg?.schoolType || 'SCHOOL').toUpperCase() === 'INDIVIDUAL'
  const canCompleteSetup =
    Boolean(reg?.isVerified) &&
    (isIndividual || currentPlan === 'trial' || paymentStatus === 'paid')

  return NextResponse.json(
    {
      authenticated: true,
      emailVerified: Boolean(reg?.isVerified),
      registration: reg,
      canCompleteSetup,
    },
    { status: 200 }
  )
}
