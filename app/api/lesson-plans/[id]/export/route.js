import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { sanitizeText } from '@/lib/lesson-plans/text'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import {
  generateLessonPlanFilename,
  generateLessonPlanWordDoc,
} from '@/lib/ai/lesson-plan-word-generator'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const id = normalize(routeParams?.id)
  if (!id) throw new ApiError('id is required', 400)

  const format = new URL(request.url).searchParams.get('format') || 'word'

  const plan = await prisma.lessonPlan.findFirst({
    where: { id, schoolId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      school: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  if (!plan) throw new ApiError('Not found', 404)

  const isOwner = String(plan.createdByUserId) === userId
  const isReviewer = String(plan.reviewerUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  if (!isOwner && !isReviewer && !isAdmin) throw new ApiError('Forbidden', 403)

  if (format === 'clean-text') {
    const clean = sanitizeText(plan.content)
    return NextResponse.json({
      success: true,
      content: clean,
      filename: `${plan.subject}_${plan.grade}_clean.txt`.replace(/\s+/g, '_'),
    })
  }

  if (format === 'word') {
    const ctx = await getLessonPlanTeacherContext(plan.createdByUserId, schoolId, plan.subject)
    const buffer = await generateLessonPlanWordDoc({
      schoolName: ctx.schoolName || plan.school?.name || '',
      teacherName: ctx.teacherName || plan.createdBy?.name || 'Teacher',
      teacherGender: ctx.teacherGender,
      departmentName: ctx.department,
      date: plan.createdAt.toLocaleDateString('en-GB'),
      subject: plan.subject,
      form: plan.grade,
      topic: plan.topic,
      subTopic: plan.subTopic || plan.topic,
      duration: plan.duration || 40,
      lessonContent: plan.content,
      approvalStatus: String(plan.status || 'DRAFT').toUpperCase(),
      approvalNotes: plan.approvalNotes || undefined,
    })

    const filename = generateLessonPlanFilename(plan.subject, plan.grade, plan.topic)

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  }

  throw new ApiError('Invalid format. Use ?format=word or ?format=clean-text', 400)
})
