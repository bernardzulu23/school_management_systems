export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Submit quizzes via the assessment workflow: POST /api/assessments/{id}/submit-hod after saving questions.',
      deprecated: true,
    },
    { status: 410 }
  )
}
