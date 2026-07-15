import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const dynamic = 'force-dynamic'

function normalize(v) {
  return String(v || '').trim()
}

async function canAccessPlan(auth, plan) {
  const userId = String(auth.user?.id || '')
  const isOwner = String(plan.createdByUserId) === userId
  const isReviewer = plan.reviewerUserId && String(plan.reviewerUserId) === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  return isOwner || isReviewer || isAdmin
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)
  const plan = await prisma.lessonPlan.findFirst({ where: { id, schoolId } })
  if (!plan) throw new ApiError('Not found', 404)
  if (!(await canAccessPlan(auth, plan))) throw new ApiError('Forbidden', 403)

  const comments = await prisma.lessonPlanComment.findMany({
    where: { lessonPlanId: id, lessonPlan: { schoolId } },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: {
      commentedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ success: true, data: { comments } })
})

export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Only HOD or administrators can add review comments', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)
  const body = await request.json().catch(() => ({}))
  const comment = normalize(body?.comment)
  const sectionReference = normalize(body?.sectionReference) || null

  if (!comment) throw new ApiError('comment is required', 400)

  const plan = await prisma.lessonPlan.findFirst({ where: { id, schoolId } })
  if (!plan) throw new ApiError('Not found', 404)

  const isReviewer = String(plan.reviewerUserId || '') === userId
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  if (!isReviewer && !isAdmin) throw new ApiError('Forbidden', 403)

  const row = await prisma.lessonPlanComment.create({
    data: {
      lessonPlanId: id,
      commentedByUserId: userId,
      comment,
      sectionReference,
      ...(schoolId ? {} : {}),
    },
    include: {
      commentedBy: { select: { id: true, name: true, email: true } },
    },
  })

  await prisma.timetableNotification.create({
    data: {
      schoolId,
      fromUserId: userId,
      toUserId: plan.createdByUserId,
      type: 'lesson_plan',
      title: 'HOD Comment on Lesson Plan',
      message: comment.slice(0, 200),
      meta: { lessonPlanId: id, commentId: row.id },
    },
  })

  return NextResponse.json({ success: true, data: row })
})
