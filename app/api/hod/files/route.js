export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'
import {
  HOD_FILE_ENTITY_TYPES,
  HOD_FILE_LABELS,
  mapHodFileRow,
  saveHodUpload,
} from '@/lib/hod/hodFiles'
import { verifyHodEntityAccess } from '@/lib/hod/verifyHodEntity'

export const GET = withErrorHandler(async function GET(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { searchParams } = new URL(request.url)
  const entityType = String(searchParams.get('entityType') || '').trim()
  const entityId = String(searchParams.get('entityId') || '').trim()

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
  }
  if (!HOD_FILE_ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
  }

  const { db, departmentId } = scope
  const entity = await verifyHodEntityAccess(db, entityType, entityId, { departmentId })
  if (!entity) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }

  const files = await db.hodFile.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: files.map(mapHodFileRow) })
})

export const POST = withErrorHandler(async function POST(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const formData = await request.formData()
  const file = formData.get('file')
  const entityType = String(formData.get('entityType') || '').trim()
  const entityId = String(formData.get('entityId') || '').trim()
  const label = String(formData.get('label') || 'attachment').trim()

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
  }
  if (!HOD_FILE_ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
  }
  if (label && !HOD_FILE_LABELS.has(label)) {
    return NextResponse.json({ error: 'Invalid label' }, { status: 400 })
  }
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  const { db, schoolId, departmentId, userId } = scope
  const entity = await verifyHodEntityAccess(db, entityType, entityId, { departmentId })
  if (!entity) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }

  let saved
  try {
    saved = await saveHodUpload({
      schoolId,
      entityType,
      entityId,
      file,
      label,
      uploadedBy: userId,
      departmentId,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 400 })
  }

  const row = await db.hodFile.create({
    data: {
      departmentId: saved.departmentId,
      entityType,
      entityId,
      label: saved.label,
      fileName: saved.fileName,
      filePath: saved.relPath,
      fileType: saved.fileType,
      fileSize: saved.fileSize,
      uploadedBy: saved.uploadedBy,
    },
  })

  if (entityType === 'correspondence') {
    const count = await db.hodFile.count({ where: { entityType, entityId } })
    await db.hodCorrespondence.update({
      where: { id: entityId },
      data: { attachments: count },
    })
  }

  return NextResponse.json({ success: true, data: mapHodFileRow(row) }, { status: 201 })
})
