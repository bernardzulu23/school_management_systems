export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  ACTIVITY_TYPES,
  canManageActivities,
  canManageAnyActivity,
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

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!canManageActivities(auth.user)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const db = getTenantClient(schoolId)
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'
  const mineOnly = searchParams.get('mine') === 'true'
  const scopeToMine = !canManageAnyActivity(auth.user) || mineOnly

  const activities = await db.activity.findMany({
    where: {
      schoolId,
      ...(includeInactive ? {} : { isActive: true }),
      ...(scopeToMine ? { organizerId: auth.user.id } : {}),
    },
    include: activityInclude,
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
  })

  return NextResponse.json({
    success: true,
    data: activities.map(mapActivity),
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!canManageActivities(auth.user)) throw new ApiError('Forbidden', 403)

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await request.json().catch(() => ({}))
  const title = String(body.title || '').trim()
  if (!title) throw new ApiError('Activity name is required', 400)

  const type = ACTIVITY_TYPES.includes(String(body.type)) ? String(body.type) : 'club'
  const description = String(body.description || '').trim()
  const location = body.location ? String(body.location).trim() : null
  const dateRaw = body.date ? new Date(body.date) : null
  const date = dateRaw && !Number.isNaN(dateRaw.getTime()) ? dateRaw : null

  const db = getTenantClient(schoolId)
  const activity = await db.activity.create({
    data: {
      schoolId,
      organizerId: auth.user.id,
      title,
      description,
      type,
      location,
      date,
      isActive: true,
    },
    include: activityInclude,
  })

  return NextResponse.json({ success: true, data: mapActivity(activity) }, { status: 201 })
})
