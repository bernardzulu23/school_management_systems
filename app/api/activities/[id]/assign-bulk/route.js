/**
 * Bulk-assign pupils to an activity (all in school, class, or house year).
 */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam, safeStringId } from '@/lib/security/safeQueryValue'
import { canEditActivity, canManageActivities, mapActivity } from '@/lib/activities/helpers'
import { hasPrimaryClasses } from '@/lib/school/schoolTypeHelpers'
import prisma from '@/lib/prisma'

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
  if (!canManageActivities(auth.user)) {
    throw new ApiError('You are not authorized to assign pupils to activities', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { level: true },
  })
  if (!hasPrimaryClasses(school)) {
    throw new ApiError('House activities are only available for primary schools', 403)
  }

  const activityId = await safeRouteParam(params, 'id')
  if (!activityId) throw new ApiError('Activity id is required', 400)
  const body = await request.json().catch(() => ({}))
  const scope = String(body.scope || 'all').toLowerCase()
  const classId = safeStringId(body.classId)
  const houseId = safeStringId(body.houseId)
  const year = Number(body.year) || new Date().getFullYear()

  const db = getTenantClient(schoolId)
  const activity = await db.activity.findFirst({ where: { id: activityId, schoolId } })
  if (!activity) throw new ApiError('Activity not found', 404)
  if (!canEditActivity(auth.user, activity)) {
    throw new ApiError('You are not authorized to edit this activity', 403)
  }

  let students = []
  if (scope === 'class' && classId) {
    students = await db.student.findMany({
      where: { schoolId, classId },
      select: { id: true, userId: true },
      take: 5000,
    })
  } else if (scope === 'house' && houseId) {
    const assignments = await db.studentHouseMembership.findMany({
      where: { schoolId, houseId, year },
      select: { studentId: true },
      take: 5000,
    })
    const ids = assignments.map((a) => a.studentId).filter(Boolean)
    students = ids.length
      ? await db.student.findMany({
          where: { schoolId, id: { in: ids } },
          select: { id: true, userId: true },
          take: 5000,
        })
      : []
  } else {
    students = await db.student.findMany({
      where: { schoolId },
      select: { id: true, userId: true },
      take: 5000,
    })
  }

  const existing = await db.activityParticipant.findMany({
    where: { activityId, schoolId },
    select: { studentId: true },
    take: 20000,
  })
  const already = new Set(existing.map((e) => String(e.studentId || '')).filter(Boolean))

  const toCreate = students.filter((s) => !already.has(String(s.id)))
  if (toCreate.length) {
    await db.activityParticipant.createMany({
      data: toCreate.map((s) => ({
        activityId,
        schoolId,
        studentId: s.id,
        userId: s.userId || null,
        role: 'member',
      })),
      skipDuplicates: true,
    })
  }

  const updated = await db.activity.findFirst({
    where: { id: activityId, schoolId },
    include: activityInclude,
  })

  return NextResponse.json({
    success: true,
    data: mapActivity(updated),
    added: toCreate.length,
  })
})
