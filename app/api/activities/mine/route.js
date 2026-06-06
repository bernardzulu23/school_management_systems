export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { mapActivity } from '@/lib/activities/helpers'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const db = getTenantClient(schoolId)
  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ success: true, data: [] })
  }

  const participants = await db.activityParticipant.findMany({
    where: { schoolId, studentId: student.id, activity: { isActive: true } },
    include: {
      activity: {
        include: {
          organizer: { select: { id: true, name: true } },
          participants: {
            include: {
              student: { select: { id: true, name: true, class: true, exam_number: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: participants.map((p) => mapActivity(p.activity)),
  })
})
