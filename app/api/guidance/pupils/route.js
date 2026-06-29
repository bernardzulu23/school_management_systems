export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'
import { matchesGuidanceScope } from '@/lib/guidance/pupilScope'

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId, assignment } = authz
  const db = getTenantClient(schoolId)

  const students = await db.student.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      class: true,
      exam_number: true,
      user: { select: { name: true } },
      _count: { select: { guidanceCases: { where: { status: 'OPEN' } } } },
    },
    orderBy: [{ class: 'asc' }, { name: 'asc' }],
    take: 5000,
  })

  const rows = students
    .filter((s) => matchesGuidanceScope(s.class, assignment.scope))
    .map((s) => ({
      id: s.id,
      name: s.name || s.user?.name || 'Unknown',
      class: s.class,
      exam_number: s.exam_number,
      open_cases: s._count?.guidanceCases || 0,
    }))

  return NextResponse.json({ success: true, data: rows, scope: assignment.scope })
})
