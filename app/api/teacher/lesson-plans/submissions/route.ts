import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'

export const dynamic = 'force-dynamic'

/**
 * GET /api/teacher/lesson-plans/submissions
 * List the teacher's chat LessonPlanSubmission rows (for stats drilldown / resubmit).
 */
export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const teacherId = String(auth.user.id)
  const db = getTenantClient(schoolId)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')?.trim().toUpperCase() || null

  const rows = await db.lessonPlanSubmission.findMany({
    where: {
      schoolId,
      teacherId,
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      topic: true,
      subject: true,
      grade: true,
      status: true,
      sessionId: true,
      hodComments: true,
      submittedAt: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ success: true, submissions: rows })
})
