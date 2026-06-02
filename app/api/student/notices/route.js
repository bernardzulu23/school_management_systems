export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

// Student-facing notices feed. Backed by the school Activity model
// (events/clubs/sport) so students see upcoming and recent school notices.
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (
    !roleCheck(auth.user, [
      'STUDENT',
      'student',
      'TEACHER',
      'teacher',
      'HOD',
      'hod',
      'ADMIN',
      'headteacher',
    ])
  ) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)
  const db = getTenantClient(schoolId)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit')) || 30))

  // Show notices from the last 30 days plus everything still upcoming.
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const activities = await db.activity.findMany({
    where: { schoolId, date: { gte: since } },
    orderBy: { date: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      location: true,
      type: true,
      organizer: { select: { name: true } },
    },
  })

  const now = Date.now()
  const notices = activities.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    date: a.date.toISOString(),
    location: a.location,
    type: a.type,
    organizer: a.organizer?.name || null,
    upcoming: a.date.getTime() >= now,
  }))

  return NextResponse.json({ success: true, data: notices })
})
