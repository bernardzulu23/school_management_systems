import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'

export async function GET(request) {
  const token = request.cookies.get('onboarding_token')?.value || ''
  const registrationId = verifyOnboardingToken(token)
  if (!registrationId) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }

  const reg = await prisma.schoolRegistration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      email: true,
      isVerified: true,
      plan: true,
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
