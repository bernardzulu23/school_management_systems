export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'
import { normalizePhoneNumbers } from '@/lib/sms'
import { withSecureHandler } from '@/lib/middleware/secureApi'

/** Save admin phone during onboarding (after email verify / session cookie). */
export const PATCH = withSecureHandler(async function PATCH(request) {
  const token = request.cookies.get('onboarding_token')?.value || ''
  const registrationId = verifyOnboardingToken(token)
  if (!registrationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const raw = String(body?.adminPhone ?? body?.phone ?? '').trim()
  const normalized = normalizePhoneNumbers(raw)
  const adminPhone = normalized[0] || raw || null

  if (raw && !adminPhone) {
    return NextResponse.json(
      { error: 'Enter a valid Zambian mobile number (+2607… or +2609…)' },
      { status: 400 }
    )
  }

  const reg = await prisma.schoolRegistration.update({
    where: { id: registrationId },
    data: { adminPhone },
    select: { id: true, adminPhone: true, email: true },
  })

  return NextResponse.json({
    success: true,
    adminPhone: reg.adminPhone,
    message: adminPhone
      ? 'Phone saved — welcome SMS will be sent when you create your portal.'
      : 'Phone removed.',
  })
})
