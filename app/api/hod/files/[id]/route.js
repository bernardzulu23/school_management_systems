export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { resolveHodScope } from '@/lib/hod/resolveHodScope'
import { deleteHodFileFromDisk } from '@/lib/hod/hodFiles'

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { db, departmentId } = scope
  const id = String(params?.id || '')

  const row = await db.hodFile.findFirst({
    where: {
      id,
      ...(departmentId != null ? { departmentId } : { departmentId: null }),
    },
  })
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteHodFileFromDisk(row.filePath)
  await db.hodFile.delete({ where: { id } })

  if (row.entityType === 'correspondence') {
    const count = await db.hodFile.count({
      where: { entityType: row.entityType, entityId: row.entityId },
    })
    await db.hodCorrespondence.update({
      where: { id: row.entityId },
      data: { attachments: count },
    })
  }

  return NextResponse.json({ success: true })
})
