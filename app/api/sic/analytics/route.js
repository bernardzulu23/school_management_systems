export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeSicOrHead } from '@/lib/sic/routeAuth'
import { applyOverdueCpdInactivity, SIC_MINUTES_GRACE_DAYS } from '@/lib/sic/sicAccess'

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeSicOrHead(request)
  if (!authz.ok) return authz.response

  const db = getTenantClient(authz.schoolId)
  const marked = await applyOverdueCpdInactivity(db, authz.schoolId)

  const [plans, inactiveDepts, himCount, activityCount] = await Promise.all([
    db.sicCpdPlan.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    db.sicDepartmentStatus.findMany({
      where: { inactive: true },
      include: { department: { select: { id: true, name: true } } },
    }),
    db.sicHimMeeting.count(),
    db.sicActivityPlan.count(),
  ])

  const byStatus = Object.fromEntries(plans.map((p) => [p.status, p._count._all]))
  const submitted =
    (byStatus.SUBMITTED || 0) +
    (byStatus.ACCEPTED || 0) +
    (byStatus.REJECTED || 0) +
    (byStatus.INACTIVE || 0)

  return NextResponse.json({
    success: true,
    data: {
      graceDays: SIC_MINUTES_GRACE_DAYS,
      markedInactiveThisPass: marked,
      plansByStatus: byStatus,
      awaitingAcceptance: byStatus.SUBMITTED || 0,
      accepted: byStatus.ACCEPTED || 0,
      rejected: byStatus.REJECTED || 0,
      inactivePlans: byStatus.INACTIVE || 0,
      inactiveDepartments: inactiveDepts.map((d) => ({
        departmentId: d.departmentId,
        name: d.department?.name,
        reason: d.reason,
        inactiveAt: d.inactiveAt,
      })),
      himMeetings: himCount,
      schoolActivityPlans: activityCount,
      submittedPlans: submitted,
    },
  })
})
