export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateHodDailyRoutineTaskSchema } from '@/lib/schemas'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { data: body, error: validationError } = await validateBody(
    request,
    UpdateHodDailyRoutineTaskSchema
  )
  if (validationError) return validationError

  const { db, departmentId } = scope
  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await db.hodDailyRoutineTask.findFirst({
    where: { id, ...hodDepartmentWhere(departmentId) },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await db.hodDailyRoutineTask.update({
    where: { id },
    data: {
      ...(body.status != null ? { status: body.status } : {}),
      ...(body.priority != null ? { priority: body.priority } : {}),
      ...(body.title != null ? { title: body.title } : {}),
      ...(body.description != null ? { description: body.description } : {}),
      ...(body.taskTime != null ? { taskTime: body.taskTime } : {}),
      ...(body.duration != null ? { duration: body.duration } : {}),
      ...(body.assignedTo != null ? { assignedTo: body.assignedTo } : {}),
      ...(body.category != null ? { category: body.category } : {}),
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
