export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'

export async function GET(request) {
  const token = request.cookies.get('onboarding_token')?.value || ''
  const registrationId = verifyOnboardingToken(token)
  if (!registrationId) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }

  const { searchParams } = new URL(request.url)
  const claimReferenceId = String(searchParams.get('claimReferenceId') || '').trim()
  const claimStatus = String(searchParams.get('claimStatus') || '')
    .trim()
    .toLowerCase()
  const shouldClaimPaid =
    claimReferenceId &&
    (claimStatus === 'paid' ||
      claimStatus === 'success' ||
      claimStatus === 'successful' ||
      claimStatus === 'completed')

  if (shouldClaimPaid) {
    await prisma.schoolRegistration.updateMany({
      where: { id: registrationId, paymentStatus: { in: ['pending', 'unpaid'] } },
      data: { paymentStatus: 'paid', paymentReference: claimReferenceId },
    })
  }

  const reg = await prisma.schoolRegistration.findUnique({
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

  return NextResponse.json({ authenticated: true, registration: reg }, { status: 200 })
}
