export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { SubmitMockExamSchema, idString } from '@/lib/schemas'
import { scoreMockExam } from '@/lib/assessment/auto-scorer'
import { paperWithResults, toAttemptSummary } from '@/lib/mock-exam'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'

export const POST = withErrorHandler(async function POST(request, { params }) {
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
  const body = await parseBodyOrThrow(request, SubmitMockExamSchema)

  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const attempt = await db.mockExamAttempt.findFirst({
    where: { id: attemptId, schoolId, studentId: student.id },
  })
  if (!attempt) throw new ApiError('Mock exam not found', 404)
  if (attempt.status !== 'in_progress') {
    throw new ApiError('This mock exam has already been submitted', 409)
  }

  const paper = attempt.paper
  const scoring = scoreMockExam(paper, body.answers)
  const now = new Date()

  const updated = await db.mockExamAttempt.update({
    where: { id: attempt.id },
    data: {
      answers: { responses: body.answers, breakdown: scoring.breakdown },
      totalMarks: scoring.totalMarks,
      awardedMarks: scoring.awardedMarks,
      percentage: scoring.percentage,
      scoreBucket: scoring.scoreBucket,
      needsReview: scoring.needsReview,
      status: scoring.status,
      submittedAt: now,
      gradedAt: scoring.needsReview ? null : now,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...toAttemptSummary(updated),
      scoring: {
        totalMarks: scoring.totalMarks,
        awardedMarks: scoring.awardedMarks,
        percentage: scoring.percentage,
        needsReview: scoring.needsReview,
        breakdown: scoring.breakdown,
      },
      paper: paperWithResults(paper, scoring.breakdown),
    },
  })
})
