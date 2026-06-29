export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateGuidanceCaseSchema } from '@/lib/schemas'
import { authorizeGuidancePortal, authorizeGuidanceHead } from '@/lib/guidance/routeAuth'
import {
  canEditCase,
  canViewCaseDetail,
  logCaseAccess,
  resolveHeadteacherUserId,
} from '@/lib/guidance/caseAccess'
import { guidanceCaseDetailInclude } from '@/lib/guidance/caseQueries'

async function loadCase(db, caseId) {
  return db.guidanceCase.findFirst({
    where: { id: caseId },
    include: guidanceCaseDetailInclude,
  })
}

async function resolveCaseAuth(request, caseId) {
  const portal = await authorizeGuidancePortal(request)
  if (portal.ok) {
    const db = getTenantClient(portal.schoolId)
    const caseRow = await loadCase(db, caseId)
    if (!caseRow) return { ok: false, status: 404, error: 'Case not found' }
    const allowed = canViewCaseDetail({
      caseRow,
      user: portal.auth.user,
      assignment: portal.assignment,
      isHead: false,
    })
    if (!allowed) return { ok: false, status: 403, error: 'Forbidden' }
    return {
      ok: true,
      schoolId: portal.schoolId,
      auth: portal.auth,
      assignment: portal.assignment,
      caseRow,
      isHead: false,
    }
  }

  const head = await authorizeGuidanceHead(request)
  if (!head.ok) return { ok: false, response: head.response }

  const db = getTenantClient(head.schoolId)
  const caseRow = await loadCase(db, caseId)
  if (!caseRow) return { ok: false, status: 404, error: 'Case not found' }
  const allowed = canViewCaseDetail({
    caseRow,
    user: head.auth.user,
    assignment: null,
    isHead: true,
  })
  if (!allowed) return { ok: false, status: 403, error: 'Forbidden' }
  return {
    ok: true,
    schoolId: head.schoolId,
    auth: head.auth,
    assignment: null,
    caseRow,
    isHead: true,
  }
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const caseId = String(routeParams?.id || '').trim()
  const authz = await resolveCaseAuth(request, caseId)
  if (!authz.ok) {
    if (authz.response) return authz.response
    throw new ApiError(authz.error, authz.status)
  }

  const db = getTenantClient(authz.schoolId)
  await logCaseAccess(db, {
    schoolId: authz.schoolId,
    caseId,
    userId: authz.auth.user.id,
    action: 'VIEW',
  })

  return NextResponse.json({ success: true, data: authz.caseRow })
})

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const routeParams = await params
  const caseId = String(routeParams?.id || '').trim()
  const authz = await resolveCaseAuth(request, caseId)
  if (!authz.ok) {
    if (authz.response) return authz.response
    throw new ApiError(authz.error, authz.status)
  }

  if (authz.isHead) throw new ApiError('Headteachers cannot edit case records directly', 403)
  if (
    !canEditCase({ caseRow: authz.caseRow, user: authz.auth.user, assignment: authz.assignment })
  ) {
    throw new ApiError('Forbidden', 403)
  }

  const { data: body, error: validationError } = await validateBody(
    request,
    UpdateGuidanceCaseSchema
  )
  if (validationError) return validationError

  const db = getTenantClient(authz.schoolId)
  const data = {}
  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === 'CLOSED') data.closedAt = new Date()
    if (body.status === 'OPEN') data.closedAt = null
  }
  if (body.summary !== undefined) data.summary = body.summary || null
  if (body.confidentiality !== undefined) data.confidentiality = body.confidentiality

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.guidanceCase.update({
      where: { id: caseId },
      data,
      include: guidanceCaseDetailInclude,
    })

    if (body.confidentiality === 'SAFEGUARDING' && !row.escalation) {
      const headId = await resolveHeadteacherUserId(tx, authz.schoolId)
      if (headId) {
        await tx.safeguardingEscalation.create({
          data: {
            schoolId: authz.schoolId,
            caseId: row.id,
            escalatedToId: headId,
            reason: body.summary || 'Case reclassified as safeguarding',
          },
        })
        await logCaseAccess(tx, {
          schoolId: authz.schoolId,
          caseId: row.id,
          userId: authz.auth.user.id,
          action: 'ESCALATE',
        })
      }
    }

    await logCaseAccess(tx, {
      schoolId: authz.schoolId,
      caseId: row.id,
      userId: authz.auth.user.id,
      action: 'EDIT',
    })

    return tx.guidanceCase.findFirst({
      where: { id: row.id },
      include: guidanceCaseDetailInclude,
    })
  })

  return NextResponse.json({ success: true, data: updated })
})
