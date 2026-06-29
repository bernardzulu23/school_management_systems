export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateReferralSchema } from '@/lib/schemas'
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

  const { data: body, error: validationError } = await validateBody(request, CreateReferralSchema)
  if (validationError) return validationError

  const status = body.status || 'PENDING'
  if (status === 'SENT' && !body.consentObtained) {
    throw new ApiError('Guardian consent is required before marking a referral as sent', 400)
  }
  if (body.consentObtained && !body.consentByGuardianId) {
    throw new ApiError('consentByGuardianId is required when consent is obtained', 400)
  }

  const referral = await db.$transaction(async (tx) => {
    const row = await tx.referralRecord.create({
      data: {
        schoolId,
        caseId,
        referredTo: body.referredTo,
        consentObtained: Boolean(body.consentObtained),
        consentByGuardianId: body.consentByGuardianId || null,
        consentNotes: body.consentNotes || null,
        status,
      },
    })

    if (status === 'SENT' || status === 'PENDING') {
      await tx.guidanceCase.update({
        where: { id: caseId },
        data: { status: 'REFERRED' },
      })
    }

    await logCaseAccess(tx, {
      schoolId,
      caseId,
      userId: auth.user.id,
      action: 'REFERRAL',
    })

    return row
  })

  const refreshed = await db.guidanceCase.findFirst({
    where: { id: caseId },
    include: guidanceCaseDetailInclude,
  })

  return NextResponse.json({ success: true, data: { referral, case: refreshed } }, { status: 201 })
})
