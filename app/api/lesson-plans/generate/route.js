import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { generateProfessionalLessonPlan } from '@/lib/ai/professional-lesson-plan'
import { assertGroqConfigured } from '@/lib/ai/groq-client'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { checkAILimit, trackAIUsage } from '@/lib/middleware/aiUsageTracker'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { buildLessonPlanHeaderBlock } from '@/lib/lesson-plans/header-block'
import { composeLessonPlanDisplay } from '@/lib/lesson-plans/text'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const blocked = await requireFeature(schoolId, 'ai-lesson-planner')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId)
  if (limitBlock) return limitBlock

  try {
    assertGroqConfigured()
  } catch {
    throw new ApiError('AI service not configured', 500)
  }

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const grade = normalize(body?.grade || body?.form)
  const subject = normalize(body?.subject)
  const topic = normalize(body?.topic)
  const subTopic = normalize(body?.subTopic || body?.subtopic) || topic
  const duration = Math.max(20, Math.min(120, Number(body?.duration) || 40))
  const term = normalize(body?.term) || 'Term 1'
  const templateType = normalize(body?.templateType) || 'professional'

  if (!grade || !subject || !topic) {
    throw new ApiError('grade, subject, and topic are required', 400)
  }

  const { content: generatedContent, tokensUsed } = await generateProfessionalLessonPlan({
    subject,
    form: grade,
    topic,
    subTopic,
    duration,
    term,
    totalPupils: body?.totalPupils,
    boys: body?.boys ?? body?.numberOfBoys,
    girls: body?.girls ?? body?.numberOfGirls,
  })

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

  return NextResponse.json({
    success: true,
    data: plan,
    message: 'Professional lesson plan generated. Review, edit if needed, then submit to your HOD.',
    tokensUsed,
  })
})
