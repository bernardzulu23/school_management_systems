export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'
import {
  ACTIVITY_TYPES,
  canEditActivity,
  canManageActivities,
  mapActivity,
} from '@/lib/activities/helpers'

const activityInclude = {
  organizer: { select: { id: true, name: true } },
  participants: {
    include: {
      student: { select: { id: true, name: true, class: true, exam_number: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: 'asc' },
  },
  _count: { select: { participants: true } },
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!canManageActivities(auth.user)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Activity id is required', 400)
  const db = getTenantClient(schoolId)

  const activity = await db.activity.findFirst({
    where: { id, schoolId },
    include: activityInclude,
  })
  if (!activity) throw new ApiError('Activity not found', 404)

  return NextResponse.json({ success: true, data: mapActivity(activity) })
})

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!canManageActivities(auth.user)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Activity id is required', 400)
  const db = getTenantClient(schoolId)

  const existing = await db.activity.findFirst({ where: { id, schoolId } })
  if (!existing) throw new ApiError('Activity not found', 404)
  if (!canEditActivity(auth.user, existing)) throw new ApiError('Forbidden', 403)

  const body = await request.json().catch(() => ({}))
  const data = {}

  if (body.title != null) {
    const title = String(body.title).trim()
    if (!title) throw new ApiError('Activity name cannot be empty', 400)
    data.title = title
  }
  if (body.description != null) data.description = String(body.description).trim()
  if (body.type != null && ACTIVITY_TYPES.includes(String(body.type))) data.type = String(body.type)
  if (body.location != null) data.location = body.location ? String(body.location).trim() : null
  if (body.date != null) {
    const dateRaw = body.date ? new Date(body.date) : null
    data.date = dateRaw && !Number.isNaN(dateRaw.getTime()) ? dateRaw : null
  }
  if (body.isActive != null) data.isActive = Boolean(body.isActive)

  const activity = await db.activity.update({
    where: { id },
    data,
    include: activityInclude,
  })

  return NextResponse.json({ success: true, data: mapActivity(activity) })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!canManageActivities(auth.user)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('Activity id is required', 400)
  const db = getTenantClient(schoolId)

  const existing = await db.activity.findFirst({ where: { id, schoolId } })
  if (!existing) throw new ApiError('Activity not found', 404)
  if (!canEditActivity(auth.user, existing)) throw new ApiError('Forbidden', 403)

  await db.activity.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true, message: 'Activity archived' })
})
