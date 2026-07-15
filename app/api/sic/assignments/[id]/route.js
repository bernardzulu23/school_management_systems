export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeSicAdmin } from '@/lib/sic/routeAuth'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const authz = await authorizeSicAdmin(request)
  if (!authz.ok) return authz.response

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const row = await prisma.sicAssignment.findFirst({
    where: { id, schoolId: authz.schoolId },
  })
  if (!row) throw new ApiError('Not found', 404)

  const updateResult = await prisma.sicAssignment.updateMany({
    where: { id, schoolId: authz.schoolId },
    data: { active: false, revokedAt: new Date() },
  })
  if (updateResult.count === 0) throw new ApiError('Not found', 404)

  return NextResponse.json({ success: true })
})
