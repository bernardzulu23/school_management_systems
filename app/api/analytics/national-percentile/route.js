export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateQuery } from '@/lib/middleware/validate-request'
import { NationalPercentileQuerySchema } from '@/lib/schemas'
import { buildScoreDistributionFromBuckets, computePercentileFromBuckets } from '@/lib/mock-exam'
import { requireFeature } from '@/lib/middleware/planGate-zambia'

const GRADED_STATUSES = ['graded', 'needs_review', 'submitted']

/**
 * Anonymous national percentile for a student's mock exam score.
 * Aggregates bucket counts only — never loads per-attempt percentages across tenants.
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

  const planBlock = await requireFeature(schoolId, 'predictive-analytics')
  if (planBlock) return planBlock

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

  // Cross-tenant aggregate of bucket counts only (no individual scores / schoolIds).
  const bucketRows = await prisma.$queryRaw`
    SELECT (FLOOR("percentage" / 10) * 10)::int AS bucket, COUNT(*)::int AS count
    FROM "MockExamAttempt"
    WHERE "subject" = ${query.subject}
      AND "examLevel" = ${query.examLevel}
      AND "status" IN ('graded', 'needs_review', 'submitted')
      AND "percentage" IS NOT NULL
    GROUP BY 1
  `

  let percentileResult = {
    percentile: null,
    sampleSize: 0,
    rankMessage: 'Submit a graded mock exam to see your national percentile.',
  }

  if (studentPercentage != null) {
    percentileResult = computePercentileFromBuckets(studentPercentage, bucketRows)
  } else {
    const sampleSize = (bucketRows || []).reduce((s, r) => s + Number(r.count || 0), 0)
    percentileResult.sampleSize = sampleSize
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
      distribution: buildScoreDistributionFromBuckets(bucketRows),
    },
  })
})
