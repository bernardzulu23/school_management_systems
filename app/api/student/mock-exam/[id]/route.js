export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { idString } from '@/lib/schemas'
import { sanitizePaperForStudent, paperWithResults, toAttemptSummary } from '@/lib/mock-exam'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'mock-exams')
  if (typeBlock) return typeBlock

  const db = getTenantClient(schoolId)

  const parsedId = idString.safeParse(String(routeParams?.id || ''))
  if (!parsedId.success) throw new ApiError('Invalid attempt id', 400)
  const attemptId = parsedId.data

  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const attempt = await db.mockExamAttempt.findFirst({
    where: { id: attemptId, schoolId, studentId: student.id },
  })
  if (!attempt) throw new ApiError('Mock exam not found', 404)

  const paper =
    attempt.status === 'in_progress'
      ? sanitizePaperForStudent(attempt.paper)
      : paperWithResults(
          attempt.paper,
          Array.isArray(attempt.answers?.breakdown) ? attempt.answers.breakdown : []
        )

  const showAnswers = attempt.status !== 'in_progress'

  return NextResponse.json({
    success: true,
    data: {
      ...toAttemptSummary(attempt),
      paper: showAnswers ? attempt.paper : paper,
      answers:
        attempt.status === 'in_progress' ? attempt.answers?.responses || null : attempt.answers,
      showAnswers,
    },
  })
})
