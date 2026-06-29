export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeGuidanceHead } from '@/lib/guidance/routeAuth'
import { buildTermlyCategoryCounts } from '@/lib/guidance/caseAccess'
import { currentTermLabel } from '@/lib/academic/currentTerm'

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeGuidanceHead(request)
  if (!authz.ok) return authz.response

  const { schoolId } = authz
  const { searchParams } = new URL(request.url)
  const term = searchParams.get('term') || currentTermLabel()
  const scopeFilter = String(searchParams.get('scope') || 'ALL').toUpperCase()

  const db = getTenantClient(schoolId)
  const cases = await db.guidanceCase.findMany({
    where: {
      openedAt: {
        gte: new Date(new Date().getFullYear(), 0, 1),
      },
    },
    select: {
      category: true,
      confidentiality: true,
      pupil: { select: { class: true } },
    },
    take: 10000,
  })

  const byCategory = buildTermlyCategoryCounts(cases, scopeFilter)
  const openCount = await db.guidanceCase.count({ where: { status: 'OPEN' } })
  const safeguardingEscalations = await db.safeguardingEscalation.count({
    where: { acknowledgedAt: null },
  })

  return NextResponse.json({
    success: true,
    data: {
      term,
      scope: scopeFilter,
      by_category: byCategory,
      open_cases_display: openCount < 3 ? '<3' : String(openCount),
      pending_escalations: safeguardingEscalations,
      note: 'Safeguarding-tier cases are excluded from category counts. Exact counts below 3 are suppressed to protect pupil identity.',
    },
  })
})
