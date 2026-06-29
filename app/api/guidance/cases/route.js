export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateGuidanceCaseSchema } from '@/lib/schemas'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'
import { GUIDANCE_LEGAL_BASIS } from '@/lib/guidance/constants'
import {
  canViewCaseDetail,
  logCaseAccess,
  resolveHeadteacherUserId,
} from '@/lib/guidance/caseAccess'
import { matchesGuidanceScope } from '@/lib/guidance/pupilScope'
import { guidanceCaseListInclude } from '@/lib/guidance/caseQueries'

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId, auth, assignment } = authz
  const db = getTenantClient(schoolId)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const cases = await db.guidanceCase.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    include: guidanceCaseListInclude,
    orderBy: { openedAt: 'desc' },
    take: 500,
  })

  const visible = cases.filter((row) =>
    canViewCaseDetail({ caseRow: row, user: auth.user, assignment, isHead: false })
  )

  return NextResponse.json({ success: true, data: visible })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId, auth, assignment } = authz
  const { data: body, error: validationError } = await validateBody(
    request,
    CreateGuidanceCaseSchema
  )
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const pupil = await db.student.findFirst({
    where: { id: body.pupilId },
    select: { id: true, class: true },
  })
  if (!pupil) throw new ApiError('Pupil not found', 404)
  if (!matchesGuidanceScope(pupil.class, assignment.scope)) {
    throw new ApiError('This pupil is outside your guidance scope', 403)
  }

  const confidentiality = body.confidentiality || 'STANDARD'

  const created = await db.$transaction(async (tx) => {
    const guidanceCase = await tx.guidanceCase.create({
      data: {
        schoolId,
        pupilId: pupil.id,
        category: body.category,
        confidentiality,
        summary: body.summary || null,
        legalBasis: GUIDANCE_LEGAL_BASIS,
        assignedToId: auth.user.id,
        openedById: auth.user.id,
      },
      include: guidanceCaseListInclude,
    })

    await logCaseAccess(tx, {
      schoolId,
      caseId: guidanceCase.id,
      userId: auth.user.id,
      action: 'EDIT',
    })

    if (confidentiality === 'SAFEGUARDING') {
      const headId = await resolveHeadteacherUserId(tx, schoolId)
      if (headId) {
        await tx.safeguardingEscalation.create({
          data: {
            schoolId,
            caseId: guidanceCase.id,
            escalatedToId: headId,
            reason:
              body.summary || 'Safeguarding case opened — immediate headteacher review required',
          },
        })
        await logCaseAccess(tx, {
          schoolId,
          caseId: guidanceCase.id,
          userId: auth.user.id,
          action: 'ESCALATE',
        })
      }
    }

    return tx.guidanceCase.findFirst({
      where: { id: guidanceCase.id },
      include: guidanceCaseListInclude,
    })
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
