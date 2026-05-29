export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateQuery } from '@/lib/middleware/validate-request'
import { NationalPercentileQuerySchema } from '@/lib/schemas'
import { buildScoreDistribution, computePercentile } from '@/lib/mock-exam'

const GRADED_STATUSES = ['graded', 'needs_review', 'submitted']

/**
 * Anonymous national percentile for a student's mock exam score.
 * Aggregates across all schools — no individual identities returned.
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

  const { data: query, error: queryError } = validateQuery(
    new URL(request.url),
    NationalPercentileQuerySchema,
    request
  )
  if (queryError) return queryError

  const student = await prisma.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  let studentPercentage = null

  if (query.attemptId) {
    const attempt = await prisma.mockExamAttempt.findFirst({
      where: {
        id: query.attemptId,
        schoolId,
        studentId: student.id,
        status: { in: GRADED_STATUSES },
      },
      select: { percentage: true, subject: true, examLevel: true },
    })
    if (!attempt) throw new ApiError('Graded mock exam not found', 404)
    if (attempt.subject !== query.subject || attempt.examLevel !== query.examLevel) {
      throw new ApiError('Subject/level mismatch for this attempt', 400)
    }
    studentPercentage = attempt.percentage
  }

  // Cross-tenant aggregate — raw SQL so RLS tenant policy does not hide peers.
  const rows = await prisma.$queryRaw`
    SELECT "percentage", "scoreBucket"
    FROM "MockExamAttempt"
    WHERE "subject" = ${query.subject}
      AND "examLevel" = ${query.examLevel}
      AND "status" IN ('graded', 'needs_review', 'submitted')
      AND "percentage" IS NOT NULL
    LIMIT 10000
  `

  const peerPercentages = (rows || [])
    .map((r) => Number(r.percentage))
    .filter((n) => Number.isFinite(n))

  let percentileResult = {
    percentile: null,
    sampleSize: peerPercentages.length,
    rankMessage: 'Submit a graded mock exam to see your national percentile.',
  }

  if (studentPercentage != null) {
    percentileResult = computePercentile(studentPercentage, peerPercentages)
  }

  return NextResponse.json({
    success: true,
    data: {
      subject: query.subject,
      examLevel: query.examLevel,
      studentPercentage,
      percentile: percentileResult.percentile,
      sampleSize: percentileResult.sampleSize,
      message: percentileResult.rankMessage,
      distribution: buildScoreDistribution(peerPercentages),
    },
  })
})
