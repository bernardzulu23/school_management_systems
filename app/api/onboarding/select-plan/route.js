export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  requireRegistrationEmailVerified,
  loadOnboardingRegistration,
} from '@/lib/onboarding/guards'
import { INDIVIDUAL_PLANS } from '@/lib/onboarding/individual'

const PAID_SCHOOL_PLANS = new Set(['basic', 'standard', 'premium'])
const PAID_INDIVIDUAL_PLANS = new Set(['individual_premium', 'individual_annual'])

export async function POST(request) {
  const loaded = await loadOnboardingRegistration(request)
  if (!loaded.ok) return loaded.response
  const reg = loaded.reg

  const verifyBlock = requireRegistrationEmailVerified(reg)
  if (verifyBlock) return verifyBlock

  const body = await request.json().catch(() => ({}))
  const plan = String(body?.plan || '')
    .trim()
    .toLowerCase()
  const isIndividual = String(reg.schoolType || 'SCHOOL').toUpperCase() === 'INDIVIDUAL'

  if (isIndividual) {
    if (!INDIVIDUAL_PLANS.has(plan)) {
      return NextResponse.json({ error: 'Invalid individual plan' }, { status: 400 })
    }
    const storedPlan = plan === 'individual_free' ? 'individual' : plan
    await prisma.schoolRegistration.update({
      where: { id: reg.id },
      data: { plan: storedPlan, paymentStatus: 'unpaid' },
    })
    return NextResponse.json(
      { success: true, plan: storedPlan, nextStep: 'setup' },
      { status: 200 }
    )
  }

  if (plan !== 'trial' && !PAID_SCHOOL_PLANS.has(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const paymentStatus = String(reg.paymentStatus || '')
    .trim()
    .toLowerCase()
  if (paymentStatus === 'paid' && plan !== 'trial') {
    return NextResponse.json(
      { error: 'Payment already completed for this registration' },
      { status: 400 }
    )
  }

  if (plan === 'trial') {
    await prisma.schoolRegistration.update({
      where: { id: reg.id },
      data: {
        plan: 'trial',
        paymentStatus: 'unpaid',
        paymentProvider: null,
        paymentReference: null,
      },
    })
    return NextResponse.json({ success: true, plan: 'trial', nextStep: 'setup' }, { status: 200 })
  }

  await prisma.schoolRegistration.update({
    where: { id: reg.id },
    data: { plan },
  })
  return NextResponse.json({ success: true, plan, nextStep: 'plan' }, { status: 200 })
}
