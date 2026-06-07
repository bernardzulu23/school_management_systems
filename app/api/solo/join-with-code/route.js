export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withSecureApi } from '@/lib/middleware/secureApi'

/** Public student self-signup is disabled — students join only via teacher registration + OTC. */
export const POST = withSecureApi(async function POST() {
  return NextResponse.json(
    {
      error:
        'Student self-registration is not available. Your teacher must register you using a one-time enrollment code.',
      code: 'STUDENT_SELF_JOIN_DISABLED',
    },
    { status: 410 }
  )
})
