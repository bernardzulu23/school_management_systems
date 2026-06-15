import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { generateStructuredLessonPlan } from '@/lib/ai/structured-lesson-plan'
import { generateProfessionalLessonPlan } from '@/lib/ai/professional-lesson-plan'
import { assertGroqConfigured } from '@/lib/ai/groq-client'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { checkAILimit, trackAIUsage } from '@/lib/middleware/aiUsageTracker'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { buildLessonPlanHeaderBlock } from '@/lib/lesson-plans/header-block'
import { composeLessonPlanDisplay } from '@/lib/lesson-plans/text'
import { logger, captureError } from '@/lib/utils/logger'
import { buildRagContextForQuery } from '@/lib/ai/rag-context'
import { getSchoolPlanForUsage } from '@/lib/middleware/aiUsageTracker'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

export const POST = withErrorHandler(async function POST(request) {
  const route = '/api/lesson-plans/generate'
  const start = Date.now()

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  const log = logger({ schoolId, userId, route })
  log.request(request)

  const blocked = await requireFeature(schoolId, 'ai-lesson-planner')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId, String(auth.user?.id || auth.user?.userId || ''))
  if (limitBlock) return limitBlock

  try {
    assertGroqConfigured()
  } catch {
    throw new ApiError('AI service not configured', 500)
  }

  if (!userId) throw new ApiError('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const grade = normalize(body?.grade || body?.form)
  const subject = normalize(body?.subject)
  const topic = normalize(body?.topic)
  const subTopic = normalize(body?.subTopic || body?.subtopic) || topic
  const duration = Math.max(20, Math.min(120, Number(body?.duration) || 40))
  const term = normalize(body?.term) || 'Term 1'
  const templateType = normalize(body?.templateType) || 'professional'
  const useMinistryFormat = body?.format === 'ministry' || body?.useMinistryFormat === true

  const constructElementIds = Array.isArray(body.constructElementIds)
    ? body.constructElementIds
    : null
  const constructStatement = body.constructStatement ? String(body.constructStatement) : null
  const sbaTaskType = body.sbaTaskType ? String(body.sbaTaskType) : null

  if (!grade || !subject || !topic) {
    throw new ApiError('grade, subject, and topic are required', 400)
  }

  const school = await getSchoolPlanForUsage(schoolId)
  const rag = await buildRagContextForQuery({
    query: `${subject} ${grade} ${topic} lesson plan`,
    schoolId,
    schoolPlan: school?.plan,
    subject,
  })

  let generatedContent
  let structuredContent = null
  let tokensUsed = 0
  let aiModel = null
  let generatedAt = null

  if (useMinistryFormat) {
    const result = await generateProfessionalLessonPlan(
      {
        subject,
        form: grade,
        topic,
        subTopic,
        duration,
        term,
        totalPupils: body?.totalPupils,
        boys: body?.boys ?? body?.numberOfBoys,
        girls: body?.girls ?? body?.numberOfGirls,
      },
      { ragBlock: rag.block }
    )
    generatedContent = result.content
    tokensUsed = result.tokensUsed
  } else {
    const result = await generateStructuredLessonPlan(
      {
        subject,
        form: grade,
        topic,
        subTopic,
        duration,
        term,
      },
      { ragBlock: rag.block }
    )
    generatedContent = result.content
    structuredContent = result.structuredContent
    tokensUsed = result.tokensUsed
    aiModel = result.aiModel
    generatedAt = new Date()
  }

  const ctx = await getLessonPlanTeacherContext(userId, schoolId, subject)
  const headerBlock = buildLessonPlanHeaderBlock({
    teacherContext: ctx,
    subject,
    grade,
    topic,
    subTopic,
    duration,
    term,
    planDate: normalize(body?.planDate) || undefined,
    numberOfBoys: body?.numberOfBoys,
    numberOfGirls: body?.numberOfGirls,
    references: normalize(body?.references) || undefined,
    teachingAids: normalize(body?.teachingAids) || undefined,
    lessonNumber: body?.lessonNumber,
    totalLessonsInUnit: body?.totalLessonsInUnit,
  })

  const content = composeLessonPlanDisplay(generatedContent, { headerBlock })

  await trackAIUsage(schoolId, 'ai-lesson-planner')

  const plan = await prisma.lessonPlan.create({
    data: {
      schoolId,
      createdByUserId: userId,
      reviewerUserId: null,
      status: 'DRAFT',
      grade,
      subject,
      topic,
      subTopic,
      duration,
      term,
      templateType,
      content,
      structuredContent: structuredContent ?? undefined,
      constructElementIds: constructElementIds ?? undefined,
      constructStatement,
      sbaTaskType,
      generatedAt,
      aiModel,
      version: 1,
    },
    select: {
      id: true,
      status: true,
      grade: true,
      subject: true,
      topic: true,
      subTopic: true,
      duration: true,
      term: true,
      createdAt: true,
    },
  })

  log.response(200, Date.now() - start)
  return NextResponse.json({
    success: true,
    data: plan,
    message: 'Professional lesson plan generated. Review, edit if needed, then submit to your HOD.',
    tokensUsed,
    ragReferences: rag.refs?.length ? rag.refs : undefined,
  })
})
