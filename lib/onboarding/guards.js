import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'

export async function loadOnboardingRegistration(request) {
  const token = request.cookies.get('onboarding_token')?.value || ''
  const registrationId = verifyOnboardingToken(token)
  if (!registrationId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const reg = await prisma.schoolRegistration.findUnique({
    where: { id: registrationId },
  })

  if (!reg) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { ok: true, reg, registrationId }
}

export function requireRegistrationEmailVerified(reg) {
  if (!reg?.isVerified) {
    return NextResponse.json(
      {
        error: 'Verify your email before continuing',
        code: 'EMAIL_NOT_VERIFIED',
      },
      { status: 403 }
    )
  }
  return null
}
