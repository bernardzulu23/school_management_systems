export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateCaseLogSchema } from '@/lib/schemas'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'
import { canEditCase, logCaseAccess } from '@/lib/guidance/caseAccess'
import { guidanceCaseDetailInclude } from '@/lib/guidance/caseQueries'

export const POST = withErrorHandler(async function POST(request, { params }) {
  const routeParams = await params
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const caseId = String(routeParams?.id || '').trim()
  const { schoolId, auth, assignment } = authz
  const db = getTenantClient(schoolId)

  const caseRow = await db.guidanceCase.findFirst({
    where: { id: caseId },
    include: { pupil: { select: { class: true } }, escalation: true },
  })
  if (!caseRow) throw new ApiError('Case not found', 404)
  if (!canEditCase({ caseRow, user: auth.user, assignment })) {
    throw new ApiError('Forbidden', 403)
  }

  const { data: body, error: validationError } = await validateBody(request, CreateCaseLogSchema)
  if (validationError) return validationError

  const entry = await db.$transaction(async (tx) => {
    const log = await tx.caseLogEntry.create({
      data: {
        schoolId,
        caseId,
        actionTaken: body.actionTaken,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        loggedById: auth.user.id,
      },
    })
    await logCaseAccess(tx, {
      schoolId,
      caseId,
      userId: auth.user.id,
      action: 'LOG_ENTRY',
    })
    return log
  })

  const refreshed = await db.guidanceCase.findFirst({
    where: { id: caseId },
    include: guidanceCaseDetailInclude,
  })

  return NextResponse.json(
    { success: true, data: { log: entry, case: refreshed } },
    { status: 201 }
  )
})
