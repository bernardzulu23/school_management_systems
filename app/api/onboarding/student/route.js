export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const POST = withSecureHandler(async function POST() {
  return NextResponse.json(
    {
      error:
        'Independent student signup is not available. Join through your school or a solo teacher workspace.',
      code: 'STUDENT_SIGNUP_DISABLED',
    },
    { status: 410 }
  )
})
