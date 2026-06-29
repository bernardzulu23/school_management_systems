export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateHodCorrespondenceSchema } from '@/lib/schemas'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { data: body, error: validationError } = await validateBody(
    request,
    UpdateHodCorrespondenceSchema
  )
  if (validationError) return validationError

  const { db, departmentId } = scope
  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await db.hodCorrespondence.findFirst({
    where: { id, ...hodDepartmentWhere(departmentId) },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await db.hodCorrespondence.update({
    where: { id },
    data: {
      ...(body.subject != null ? { subject: body.subject } : {}),
      ...(body.party != null ? { party: body.party } : {}),
      ...(body.direction != null ? { direction: body.direction } : {}),
      ...(body.priority != null ? { priority: body.priority } : {}),
      ...(body.status != null ? { status: body.status } : {}),
      ...(body.itemType != null ? { itemType: body.itemType } : {}),
      ...(body.attachments != null ? { attachments: body.attachments } : {}),
      ...(body.itemDate != null ? { itemDate: new Date(body.itemDate) } : {}),
    },
  })

  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { db, departmentId } = scope
  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await db.hodCorrespondence.findFirst({
    where: { id, ...hodDepartmentWhere(departmentId) },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.hodCorrespondence.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
