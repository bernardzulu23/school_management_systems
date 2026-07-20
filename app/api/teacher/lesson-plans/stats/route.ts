import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import {
  countsFromGroupBy,
  getRequiredLessonPlansPerTerm,
  syllabusReadinessIndex,
  totalFromCounts,
} from '@/lib/ai/chat/lesson-plan-readiness'

export const dynamic = 'force-dynamic'

/**
 * GET /api/teacher/lesson-plans/stats
 * Single Prisma groupBy on LessonPlanSubmission by SubmissionStatus for the
 * authenticated teacher, scoped to schoolId (tenant).
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

  const grouped = await db.lessonPlanSubmission.groupBy({
    by: ['status'],
    where: { schoolId, teacherId },
    _count: { _all: true },
  })

  const counts = countsFromGroupBy(
    grouped.map((g: { status: string; _count: { _all: number } }) => ({
      status: g.status,
      _count: g._count._all,
    }))
  )

  const requiredCount = getRequiredLessonPlansPerTerm()
  const readiness = syllabusReadinessIndex(counts.APPROVED, requiredCount)

  return NextResponse.json({
    success: true,
    schoolId,
    teacherId,
    counts,
    total: totalFromCounts(counts),
    readiness,
  })
})
