export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateReEntrySchema } from '@/lib/schemas'
import { authorizeReEntryAccess } from '@/lib/guidance/routeAuth'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

const reEntryInclude = {
  pupil: { select: { id: true, name: true, class: true, exam_number: true } },
  case: { select: { id: true, status: true, confidentiality: true } },
}

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const recordId = await safeRouteParam(params, 'id')
  if (!recordId) throw new ApiError('Invalid id', 400)

  const authz = await authorizeReEntryAccess(request)
  if (!authz.ok) return authz.response

  const { schoolId } = authz
  const { data: body, error: validationError } = await validateBody(request, UpdateReEntrySchema)
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const existing = await db.girlsReEntryRecord.findFirst({ where: { id: recordId } })
  if (!existing) throw new ApiError('Re-entry record not found', 404)

  const data = {}
  if (body.withdrawalDate !== undefined) data.withdrawalDate = new Date(body.withdrawalDate)
  if (body.expectedReturnDate !== undefined) {
    data.expectedReturnDate = body.expectedReturnDate ? new Date(body.expectedReturnDate) : null
  }
  if (body.actualReturnDate !== undefined) {
    data.actualReturnDate = body.actualReturnDate ? new Date(body.actualReturnDate) : null
  }
  if (body.supportPlan !== undefined) data.supportPlan = body.supportPlan || null
  if (body.consentGuardian !== undefined) data.consentGuardian = Boolean(body.consentGuardian)
  if (body.caseId !== undefined) data.caseId = body.caseId || null

  const updated = await db.girlsReEntryRecord.update({
    where: { id: existing.id },
    data,
    include: reEntryInclude,
  })

  return NextResponse.json({ success: true, data: updated })
})
