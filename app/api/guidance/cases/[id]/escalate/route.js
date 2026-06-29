export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { EscalateCaseSchema } from '@/lib/schemas'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'
import { canEditCase, logCaseAccess, resolveHeadteacherUserId } from '@/lib/guidance/caseAccess'
import { guidanceCaseDetailInclude } from '@/lib/guidance/caseQueries'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const POST = withErrorHandler(async function POST(request, { params }) {
  const caseId = await safeRouteParam(params, 'id')
  if (!caseId) throw new ApiError('Invalid id', 400)
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId, auth, assignment } = authz
  const db = getTenantClient(schoolId)

  const caseRow = await db.guidanceCase.findFirst({
    where: { id: caseId },
    include: { escalation: true, pupil: { select: { class: true } } },
  })
  if (!caseRow) throw new ApiError('Case not found', 404)
  if (!canEditCase({ caseRow, user: auth.user, assignment })) {
    throw new ApiError('Forbidden', 403)
  }

  const { data: body, error: validationError } = await validateBody(request, EscalateCaseSchema)
  if (validationError) return validationError

  const headId = await resolveHeadteacherUserId(db, schoolId)
  if (!headId) throw new ApiError('No headteacher account found for escalation', 400)

  const updated = await db.$transaction(async (tx) => {
    await tx.guidanceCase.update({
      where: { id: caseId },
      data: { confidentiality: 'SAFEGUARDING' },
    })

    if (caseRow.escalation) {
      await tx.safeguardingEscalation.update({
        where: { id: caseRow.escalation.id },
        data: { reason: body.reason, escalatedAt: new Date(), acknowledgedAt: null },
      })
    } else {
      await tx.safeguardingEscalation.create({
        data: {
          schoolId,
          caseId,
          escalatedToId: headId,
          reason: body.reason,
        },
      })
    }

    await logCaseAccess(tx, {
      schoolId,
      caseId,
      userId: auth.user.id,
      action: 'ESCALATE',
    })

    return tx.guidanceCase.findFirst({
      where: { id: caseId },
      include: guidanceCaseDetailInclude,
    })
  })

  return NextResponse.json({ success: true, data: updated })
})
