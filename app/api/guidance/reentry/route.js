export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateReEntrySchema } from '@/lib/schemas'
import { authorizeReEntryAccess } from '@/lib/guidance/routeAuth'
import { matchesGuidanceScope } from '@/lib/guidance/pupilScope'

const reEntryInclude = {
  pupil: { select: { id: true, name: true, class: true, exam_number: true } },
  case: { select: { id: true, status: true, confidentiality: true } },
}

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeReEntryAccess(request)
  if (!authz.ok) return authz.response

  const { schoolId, assignment } = authz
  const db = getTenantClient(schoolId)

  const rows = await db.girlsReEntryRecord.findMany({
    include: reEntryInclude,
    orderBy: { withdrawalDate: 'desc' },
    take: 200,
  })

  const filtered = assignment
    ? rows.filter((r) => matchesGuidanceScope(r.pupil?.class, assignment.scope))
    : rows

  return NextResponse.json({ success: true, data: filtered })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeReEntryAccess(request)
  if (!authz.ok) return authz.response

  const { schoolId, assignment } = authz
  const { data: body, error: validationError } = await validateBody(request, CreateReEntrySchema)
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const pupil = await db.student.findFirst({
    where: { id: body.pupilId },
    select: { id: true, class: true },
  })
  if (!pupil) throw new ApiError('Pupil not found', 404)
  if (assignment && !matchesGuidanceScope(pupil.class, assignment.scope)) {
    throw new ApiError('This pupil is outside your guidance scope', 403)
  }

  const created = await db.girlsReEntryRecord.create({
    data: {
      schoolId,
      pupilId: pupil.id,
      withdrawalDate: new Date(body.withdrawalDate),
      expectedReturnDate: body.expectedReturnDate ? new Date(body.expectedReturnDate) : null,
      actualReturnDate: body.actualReturnDate ? new Date(body.actualReturnDate) : null,
      supportPlan: body.supportPlan || null,
      consentGuardian: Boolean(body.consentGuardian),
      caseId: body.caseId || null,
    },
    include: reEntryInclude,
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
