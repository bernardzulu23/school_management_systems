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
import {
  assertStudentSubjectAllowed,
  resolveStudentGradeLabel,
} from '@/lib/flashcards/studentSubjects'
import { assertCurriculumTopicAllowed } from '@/lib/ai/curriculum-context'
import { runValidationSideBySide } from '@/lib/ecz/eoc/runValidationSideBySide'

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
  const examLevel = normalizeEczExamLevel(body.examLevel || 'form1')

  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: {
      id: true,
      class: true,
      classRef: { select: { year_group: true } },
    },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const subject = await assertStudentSubjectAllowed(student.id, schoolId, body.subject, {
    action: 'take a mock exam in',
  })
  const gradeLevel = resolveStudentGradeLabel(student) || examLevel
  let topic
  try {
    topic = await assertCurriculumTopicAllowed(subject, gradeLevel, body.topic, {
      required: true,
    })
  } catch (e) {
    throw new ApiError(e?.message || 'Invalid topic for this subject', 400)
  }

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
      subject,
      topic,
      examLevel,
      questionCount: body.questionCount ?? 8,
      schoolId,
      gradeLevel,
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
      subject,
      examLevel,
      topic,
      durationMinutes,
      paper: paperResult.paper,
      totalMarks,
      status: 'in_progress',
    },
  })

  const paper = paperResult.paper || {}
  const sideBySideItems = []
  if (Array.isArray(paper.scenarios)) {
    for (const scenario of paper.scenarios) {
      sideBySideItems.push({ kind: 'scenario', scenario })
    }
  }
  if (Array.isArray(paper.questions)) {
    for (const question of paper.questions) {
      sideBySideItems.push({ kind: 'practice_question', question })
    }
  }
  void runValidationSideBySide({
    schoolId,
    source: 'mock_exam',
    subject,
    topicTag: topic,
    formLevel: gradeLevel || examLevel,
    items: sideBySideItems,
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    data: {
      ...toAttemptSummary(attempt),
      paper: sanitizePaperForStudent(paperResult.paper),
      ragReferences: paperResult.ragReferences,
    },
  })
})
