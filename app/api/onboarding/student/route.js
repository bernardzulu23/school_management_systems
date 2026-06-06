export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Independent student signup is not available. Join through your school or a solo teacher workspace.',
      code: 'STUDENT_SIGNUP_DISABLED',
    },
    { status: 410 }
  )
}
