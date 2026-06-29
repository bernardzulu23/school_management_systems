import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { resolveReviewerUserId } from '@/lib/lesson-plans/reviewer'
import { sanitizeText } from '@/lib/lesson-plans/text'
import { isIndividualSchool } from '@/lib/middleware/individual-gate'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const scope = safeQueryString(searchParams.get('scope'), { defaultValue: '' })
  const status = safeQueryString(searchParams.get('status'), { defaultValue: '' })

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const role = String(auth.user?.role || '').toLowerCase()

  const wantsMine = scope.toLowerCase() === 'mine' || role === 'teacher'
  const wantsReview = scope.toLowerCase() === 'review' || role === 'hod'

  if (!wantsMine && !wantsReview && !roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const where = { schoolId }

  if (wantsMine) where.createdByUserId = userId
  if (wantsReview) where.reviewerUserId = userId

  if (status) where.status = status.toUpperCase()

  const plans = await prisma.lessonPlan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      status: true,
      grade: true,
      subject: true,
      topic: true,
      subTopic: true,
      duration: true,
      term: true,
      templateType: true,
      createdAt: true,
      submittedAt: true,
      approvedAt: true,
      rejectedAt: true,
      rejectionReason: true,
      approvalNotes: true,
      version: true,
      createdBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ success: true, data: { plans } })
})

export const POST = withErrorHandler(async function POST(request) {
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
  if (!userId) throw new ApiError('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const grade = normalize(body?.grade)
  const subject = normalize(body?.subject)
  const topic = normalize(body?.topic)
  const content = sanitizeText(normalize(body?.content))
  const subTopic = normalize(body?.subTopic || body?.subtopic) || null
  const term = normalize(body?.term) || null
  const duration =
    body?.duration != null && Number.isFinite(Number(body.duration)) ? Number(body.duration) : null
  const templateType = normalize(body?.templateType) || 'professional'
  const submitNow = body?.submit === true || body?.status === 'SUBMITTED'

  if (!grade || !subject || !topic || !content) {
    throw new ApiError('grade, subject, topic and content are required', 400)
  }

  let reviewerUserId = null
  let status = 'DRAFT'
  let submittedAt = null
  let approvedAt = null

  const individual = await isIndividualSchool(schoolId)

  if (submitNow) {
    if (individual) {
      status = 'APPROVED'
      submittedAt = new Date()
      approvedAt = new Date()
    } else {
      reviewerUserId = await resolveReviewerUserId({
        schoolId,
        teacherUserId: userId,
        grade,
        subject,
      })
      if (!reviewerUserId) {
        throw new ApiError('No reviewer found for this lesson plan', 400)
      }
      status = 'SUBMITTED'
      submittedAt = new Date()
    }
  }

  const plan = await prisma.lessonPlan.create({
    data: {
      schoolId,
      createdByUserId: userId,
      reviewerUserId,
      status,
      grade,
      subject,
      topic,
      subTopic,
      duration,
      term,
      templateType,
      content,
      submittedAt,
      approvedAt,
    },
    select: {
      id: true,
      reviewerUserId: true,
      createdByUserId: true,
      grade: true,
      subject: true,
      topic: true,
      status: true,
      createdAt: true,
    },
  })

  if (submitNow && reviewerUserId && !individual) {
    await prisma.timetableNotification.create({
      data: {
        schoolId,
        fromUserId: userId,
        toUserId: reviewerUserId,
        type: 'lesson_plan',
        title: 'New Lesson Plan Submitted',
        message: `${plan.subject} • ${plan.grade} • ${plan.topic}`,
        meta: {
          lessonPlanId: plan.id,
          grade: plan.grade,
          subject: plan.subject,
          topic: plan.topic,
        },
      },
    })
  }

  return NextResponse.json({ success: true, data: plan })
})
