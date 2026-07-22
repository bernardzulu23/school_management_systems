export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { listCurriculumTopics } from '@/lib/ai/curriculum-context'

/**
 * GET /api/curriculum-topics?subject=&grade=
 * Curriculum topics for a subject + form/grade (CDC / form1-4 JSON).
 * Used by quiz, topic-test, lesson planner, ECZ builders, etc.
 */
export const GET = withErrorHandler(async function GET(request) {
  const user = await getAuthUser(request)
  if (!user) throw new ApiError('Unauthorized', 401)
  if (
    !roleCheck(user, [
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
      'STUDENT',
      'student',
    ])
  ) {
    throw new ApiError('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const subject = String(searchParams.get('subject') || '').trim()
  const grade = String(
    searchParams.get('grade') || searchParams.get('gradeOrForm') || searchParams.get('form') || ''
  ).trim()

  if (!subject) throw new ApiError('subject is required', 400)
  if (!grade) throw new ApiError('grade (or gradeOrForm / form) is required', 400)

  const topics = await listCurriculumTopics(subject, grade)

  return NextResponse.json({
    success: true,
    data: {
      subject,
      gradeOrForm: grade,
      topics,
    },
  })
})
