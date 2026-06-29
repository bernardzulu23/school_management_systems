export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam, safeStringId } from '@/lib/security/safeQueryValue'
import { canEditActivity, canManageActivities, mapActivity } from '@/lib/activities/helpers'

const activityInclude = {
  organizer: { select: { id: true, name: true } },
  participants: {
    include: {
      student: { select: { id: true, name: true, class: true, exam_number: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: 'asc' },
  },
}

export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!canManageActivities(auth.user)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const activityId = await safeRouteParam(params, 'id')
  if (!activityId) throw new ApiError('Activity id is required', 400)
  const body = await request.json().catch(() => ({}))
  const studentId = safeStringId(body.studentId)
  if (!studentId) throw new ApiError('studentId is required', 400)

  const db = getTenantClient(schoolId)
  const activity = await db.activity.findFirst({ where: { id: activityId, schoolId } })
  if (!activity) throw new ApiError('Activity not found', 404)
  if (!canEditActivity(auth.user, activity)) throw new ApiError('Forbidden', 403)

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true, userId: true, name: true },
  })
  if (!student) throw new ApiError('Student not found in this school', 404)

  const existing = await db.activityParticipant.findFirst({
    where: { activityId, schoolId, studentId },
  })
  if (existing) throw new ApiError('Student is already registered for this activity', 409)

  await db.activityParticipant.create({
    data: {
      activityId,
      schoolId,
      studentId: student.id,
      userId: student.userId || null,
      role: body.role === 'leader' ? 'leader' : 'member',
    },
  })

  const updated = await db.activity.findFirst({
    where: { id: activityId, schoolId },
    include: activityInclude,
  })

  return NextResponse.json({ success: true, data: mapActivity(updated) }, { status: 201 })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!canManageActivities(auth.user)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const activityId = await safeRouteParam(params, 'id')
  if (!activityId) throw new ApiError('Activity id is required', 400)
  const { searchParams } = new URL(request.url)
  const studentId = safeStringId(searchParams.get('studentId'))
  if (!studentId) throw new ApiError('studentId query param is required', 400)

  const db = getTenantClient(schoolId)
  const activity = await db.activity.findFirst({ where: { id: activityId, schoolId } })
  if (!activity) throw new ApiError('Activity not found', 404)
  if (!canEditActivity(auth.user, activity)) throw new ApiError('Forbidden', 403)

  const participant = await db.activityParticipant.findFirst({
    where: { activityId, schoolId, studentId },
  })
  if (!participant) throw new ApiError('Participant not found', 404)

  await db.activityParticipant.delete({ where: { id: participant.id } })

  const updated = await db.activity.findFirst({
    where: { id: activityId, schoolId },
    include: activityInclude,
  })

  return NextResponse.json({ success: true, data: mapActivity(updated) })
})
