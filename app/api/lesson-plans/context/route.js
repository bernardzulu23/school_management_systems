import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const subject = new URL(request.url).searchParams.get('subject') || undefined
  const context = await getLessonPlanTeacherContext(userId, schoolId, subject)

  return NextResponse.json({ success: true, data: context })
})
