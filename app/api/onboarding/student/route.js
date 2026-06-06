export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

/** @deprecated Use /join/student with email verification and payment flow */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Direct student signup is disabled. Use /join/student to verify your email and complete onboarding.',
      code: 'USE_JOIN_FLOW',
    },
    { status: 410 }
  )
}
