export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authorizeGuidanceHead } from '@/lib/guidance/routeAuth'
import { guidanceCaseDetailInclude } from '@/lib/guidance/caseQueries'
import { logCaseAccess } from '@/lib/guidance/caseAccess'

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeGuidanceHead(request)
  if (!authz.ok) return authz.response

  const { schoolId, auth } = authz
  const db = getTenantClient(schoolId)

  const escalations = await db.safeguardingEscalation.findMany({
    where: { escalatedToId: auth.user.id },
    include: {
      case: { include: guidanceCaseDetailInclude },
    },
    orderBy: { escalatedAt: 'desc' },
    take: 100,
  })

  for (const row of escalations) {
    if (row.case?.id) {
      await logCaseAccess(db, {
        schoolId,
        caseId: row.case.id,
        userId: auth.user.id,
        action: 'VIEW',
      })
    }
  }

  return NextResponse.json({ success: true, data: escalations })
})

export const PATCH = withErrorHandler(async function PATCH(request) {
  const authz = await authorizeGuidanceHead(request)
  if (!authz.ok) return authz.response

  const { schoolId, auth } = authz
  const body = await request.json().catch(() => ({}))
  const escalationId = String(body?.id || '').trim()
  if (!escalationId) {
    return NextResponse.json({ error: 'Escalation id is required' }, { status: 400 })
  }

  const db = getTenantClient(schoolId)
  const existing = await db.safeguardingEscalation.findFirst({
    where: { id: escalationId, escalatedToId: auth.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Escalation not found' }, { status: 404 })
  }

  const updated = await db.safeguardingEscalation.update({
    where: { id: existing.id },
    data: { acknowledgedAt: new Date() },
    include: { case: { include: guidanceCaseDetailInclude } },
  })

  return NextResponse.json({ success: true, data: updated })
})
