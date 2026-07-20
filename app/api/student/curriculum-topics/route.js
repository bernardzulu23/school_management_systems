export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  assertStudentSubjectAllowed,
  resolveStudentGradeLabel,
} from '@/lib/flashcards/studentSubjects'
import { listCurriculumTopics } from '@/lib/ai/curriculum-context'

/**
 * GET /api/student/curriculum-topics?subject=
 * Topics from ingested curriculum JSON for an enrolled subject + the student's grade/form.
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)
  const db = getTenantClient(schoolId)

  const { searchParams } = new URL(request.url)
  const subjectRaw = String(searchParams.get('subject') || '').trim()
  if (!subjectRaw) throw new ApiError('subject is required', 400)

  const student = await db.student.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: {
      id: true,
      class: true,
      classRef: { select: { year_group: true } },
    },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const subjectName = await assertStudentSubjectAllowed(student.id, schoolId, subjectRaw, {
    action: 'load topics for',
  })
  const gradeOrForm = resolveStudentGradeLabel(student)
  const topics = await listCurriculumTopics(subjectName, gradeOrForm || 'Form 1')

  return NextResponse.json({
    success: true,
    data: {
      subject: subjectName,
      gradeOrForm: gradeOrForm || null,
      topics,
    },
  })
})
