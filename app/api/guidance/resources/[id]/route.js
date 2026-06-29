export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { UpdateCareerResourceSchema } from '@/lib/schemas'
import { authorizeGuidancePortal } from '@/lib/guidance/routeAuth'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const resourceId = await safeRouteParam(params, 'id')
  if (!resourceId) throw new ApiError('Invalid id', 400)

  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId } = authz
  const { data: body, error: validationError } = await validateBody(
    request,
    UpdateCareerResourceSchema
  )
  if (validationError) return validationError

  const db = getTenantClient(schoolId)
  const existing = await db.careerResource.findFirst({ where: { id: resourceId } })
  if (!existing) throw new ApiError('Resource not found', 404)

  const data = {}
  if (body.type !== undefined) data.type = body.type
  if (body.title !== undefined) data.title = body.title
  if (body.body !== undefined) data.body = body.body
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
  if (body.active !== undefined) data.active = body.active

  const updated = await db.careerResource.update({
    where: { id: existing.id },
    data,
    include: { postedBy: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const resourceId = await safeRouteParam(params, 'id')
  if (!resourceId) throw new ApiError('Invalid id', 400)

  const authz = await authorizeGuidancePortal(request)
  if (!authz.ok) return authz.response

  const { schoolId } = authz
  const db = getTenantClient(schoolId)

  const existing = await db.careerResource.findFirst({ where: { id: resourceId } })
  if (!existing) throw new ApiError('Resource not found', 404)

  await db.careerResource.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
})
