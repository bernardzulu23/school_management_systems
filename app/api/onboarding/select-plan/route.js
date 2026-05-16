export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'

const PAID_PLANS = new Set(['basic', 'standard', 'premium'])

export async function POST(request) {
  const token = request.cookies.get('onboarding_token')?.value || ''
  const registrationId = verifyOnboardingToken(token)
  if (!registrationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reg = await prisma.schoolRegistration.findUnique({
    where: { id: registrationId },
    select: { id: true, isVerified: true, paymentStatus: true },
  })
  if (!reg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!reg.isVerified) {
    return NextResponse.json(
      { error: 'Verify your email before starting a free trial or selecting a plan' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const plan = String(body?.plan || '')
    .trim()
    .toLowerCase()
  if (plan !== 'trial' && !PAID_PLANS.has(plan)) {
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
