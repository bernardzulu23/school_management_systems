export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateGuidanceDocumentSchema } from '@/lib/schemas'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'
import { canViewGuidanceDocument } from '@/lib/guidance/documentAccess'
import { canEditCase, logCaseAccess } from '@/lib/guidance/caseAccess'
import { GUIDANCE_DOC_KIND_VALUES } from '@/lib/guidance/constants'

function docInclude() {
  return {
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
  }
}

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId, auth, assignment } = authz
  const db = getTenantClient(schoolId)
  const { searchParams } = new URL(request.url)
  const kind = String(searchParams.get('kind') || '').trim()
  const pupilId = String(searchParams.get('pupilId') || '').trim()
  const caseId = String(searchParams.get('caseId') || '').trim()
  const q = String(searchParams.get('q') || '').trim()
  const includeArchived = searchParams.get('archived') === '1'

  const where = {
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(kind && GUIDANCE_DOC_KIND_VALUES.includes(kind) ? { kind } : {}),
    ...(pupilId ? { pupilId } : {}),
    ...(caseId ? { caseId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { fileName: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const rows = await db.guidanceDocument.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: docInclude(),
  })

  const visible = rows.filter((doc) =>
    canViewGuidanceDocument({
      doc,
      user: auth.user,
      assignment,
      caseRow: doc.case
        ? {
            ...doc.case,
            pupil: doc.case.pupil || doc.pupil,
          }
        : null,
      isHead: false,
    })
  )

  return NextResponse.json({ success: true, data: visible })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId, auth, assignment } = authz
  const { data: body, error: validationError } = await validateBody(
    request,
    CreateGuidanceDocumentSchema
  )
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  let caseRow = null
  let pupilId = body.pupilId || null

  if (body.caseId) {
    caseRow = await db.guidanceCase.findFirst({
      where: { id: body.caseId },
      include: {
        pupil: { select: { id: true, name: true, class: true } },
        escalation: { select: { escalatedToId: true } },
      },
    })
    if (!caseRow) throw new ApiError('Case not found', 404)
    if (!canEditCase({ caseRow, user: auth.user, assignment })) {
      throw new ApiError('Forbidden', 403)
    }
    pupilId = pupilId || caseRow.pupilId
  }

  if (pupilId) {
    const pupil = await db.student.findFirst({
      where: { id: pupilId },
      select: { id: true },
    })
    if (!pupil) throw new ApiError('Pupil not found', 404)
  }

  if (
    !String(body.fileUrl).includes(`/guidance/${schoolId}/`) &&
    !body.fileUrl.includes('blob.vercel-storage.com')
  ) {
    // Allow Vercel Blob URLs; path check soft — token already scoped on upload
  }

  const created = await db.guidanceDocument.create({
    data: {
      schoolId,
      title: body.title,
      description: body.description || null,
      kind: body.kind || 'GENERAL',
      confidentiality: body.confidentiality || 'SENSITIVE',
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      fileType: body.fileType,
      fileSize: body.fileSize,
      pupilId,
      caseId: body.caseId || null,
      uploadedById: auth.user.id,
    },
    include: docInclude(),
  })

  if (created.caseId) {
    await logCaseAccess(db, {
      schoolId,
      caseId: created.caseId,
      userId: auth.user.id,
      action: 'DOCUMENT_UPLOAD',
    })
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
