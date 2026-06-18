export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { StartMockExamSchema } from '@/lib/schemas'
import { generateMockExamPaper } from '@/lib/mock-exam/generate-paper'
import { sanitizePaperForStudent, toAttemptSummary } from '@/lib/mock-exam'
import { normalizeEczExamLevel } from '@/lib/ecz/ecz-practice-levels'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { getPerMinuteLimit, getSchoolPlanForUsage } from '@/lib/middleware/aiUsageTracker'

export const POST = withErrorHandler(async function POST(request) {
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

  const blocked = await requireFeature(schoolId, 'ecz-practice')
  if (blocked) return blocked

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'mock-exams')
  if (typeBlock) return typeBlock

  const school = await getSchoolPlanForUsage(schoolId)
  const perMinuteLimit = getPerMinuteLimit(school?.plan)
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? perMinuteLimit : perMinuteLimit * 20,
    windowMs: 60 * 1000,
    keyPrefix: 'mock_exam_start_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(auth.user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const body = await parseBodyOrThrow(request, StartMockExamSchema)
  const examLevel = normalizeEczExamLevel(body.examLevel || 'grade9')

  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const inProgress = await db.mockExamAttempt.findFirst({
    where: { schoolId, studentId: student.id, status: 'in_progress' },
    select: { id: true },
  })
  if (inProgress) {
    throw new ApiError('Finish your current mock exam before starting another', 409)
  }

  let paperResult
  try {
    paperResult = await generateMockExamPaper({
      subject: body.subject,
      topic: body.topic,
      examLevel,
      questionCount: body.questionCount ?? 8,
      schoolId,
    })
  } catch (err) {
    throw new ApiError(err?.message || 'Failed to generate mock exam', 502)
  }

  const durationMinutes = body.durationMinutes ?? 120
  const totalMarks = (paperResult.paper.questions || []).reduce(
    (sum, q) => sum + (Number(q.marks) || 0),
    0
  )

  const attempt = await db.mockExamAttempt.create({
    data: {
      schoolId,
      studentId: student.id,
      subject: body.subject,
      examLevel,
      topic: body.topic,
      durationMinutes,
      paper: paperResult.paper,
      totalMarks,
      status: 'in_progress',
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...toAttemptSummary(attempt),
      paper: sanitizePaperForStudent(paperResult.paper),
      ragReferences: paperResult.ragReferences,
    },
  })
})
