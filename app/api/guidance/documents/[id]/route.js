export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateGuidanceDocumentSchema } from '@/lib/schemas'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'
import { canManageGuidanceDocument, canViewGuidanceDocument } from '@/lib/guidance/documentAccess'
import { logCaseAccess } from '@/lib/guidance/caseAccess'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

async function loadDoc(db, id) {
  return db.guidanceDocument.findFirst({
    where: { id },
    include: {
      uploadedBy: { select: { id: true, name: true } },
      pupil: { select: { id: true, name: true, class: true } },
      case: {
        select: {
          id: true,
          assignedToId: true,
          confidentiality: true,
          category: true,
          status: true,
          pupil: { select: { id: true, name: true, class: true } },
          escalation: { select: { escalatedToId: true } },
        },
      },
    },
  })
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const { schoolId, auth, assignment } = authz
  const db = getTenantClient(schoolId)
  const doc = await loadDoc(db, id)
  if (!doc) throw new ApiError('Not found', 404)

  const caseRow = doc.case ? { ...doc.case, pupil: doc.case.pupil || doc.pupil } : null
  if (!canViewGuidanceDocument({ doc, user: auth.user, assignment, caseRow })) {
    throw new ApiError('Forbidden', 403)
  }

  if (doc.caseId) {
    await logCaseAccess(db, {
      schoolId,
      caseId: doc.caseId,
      userId: auth.user.id,
      action: 'DOCUMENT_VIEW',
    })
  }

  return NextResponse.json({ success: true, data: doc })
})

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const { schoolId, auth, assignment } = authz
  const { data: body, error: validationError } = await validateBody(
    request,
    UpdateGuidanceDocumentSchema
  )
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const doc = await loadDoc(db, id)
  if (!doc) throw new ApiError('Not found', 404)

  const caseRow = doc.case ? { ...doc.case, pupil: doc.case.pupil || doc.pupil } : null
  if (!canManageGuidanceDocument({ doc, user: auth.user, assignment, caseRow })) {
    throw new ApiError('Forbidden', 403)
  }

  const updated = await db.guidanceDocument.update({
    where: { id },
    data: {
      ...(body.title != null ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.kind ? { kind: body.kind } : {}),
      ...(body.confidentiality ? { confidentiality: body.confidentiality } : {}),
      ...(body.archived === true ? { archivedAt: new Date() } : {}),
      ...(body.archived === false ? { archivedAt: null } : {}),
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
      pupil: { select: { id: true, name: true, class: true } },
      case: {
        select: {
          id: true,
          assignedToId: true,
          confidentiality: true,
          category: true,
          status: true,
        },
      },
    },
  })

  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const { schoolId, auth, assignment } = authz
  const db = getTenantClient(schoolId)
  const doc = await loadDoc(db, id)
  if (!doc) throw new ApiError('Not found', 404)

  const caseRow = doc.case ? { ...doc.case, pupil: doc.case.pupil || doc.pupil } : null
  if (!canManageGuidanceDocument({ doc, user: auth.user, assignment, caseRow })) {
    throw new ApiError('Forbidden', 403)
  }

  // Soft-archive by default; ?hard=1 permanently deletes metadata (+ blob when possible)
  const hard = new URL(request.url).searchParams.get('hard') === '1'
  if (!hard) {
    const archived = await db.guidanceDocument.update({
      where: { id },
      data: { archivedAt: new Date() },
    })
    return NextResponse.json({ success: true, data: archived, archived: true })
  }

  if (process.env.BLOB_READ_WRITE_TOKEN && doc.fileUrl) {
    try {
      await del(doc.fileUrl, { token: process.env.BLOB_READ_WRITE_TOKEN })
    } catch (err) {
      console.warn('[guidance-documents] blob delete failed', err?.message || err)
    }
  }

  await db.guidanceDocument.delete({ where: { id } })
  return NextResponse.json({ success: true, deleted: true })
})
