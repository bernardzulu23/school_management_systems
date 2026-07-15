export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeGuidanceAssignmentAdmin } from '@/lib/guidance/routeAuth'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const assignmentId = await safeRouteParam(params, 'id')
  if (!assignmentId) throw new ApiError('Assignment id is required', 400)

  const authz = await authorizeGuidanceAssignmentAdmin(request)
  if (!authz.ok) return authz.response

  const { schoolId } = authz

  const existing = await prisma.guidanceAssignment.findFirst({
    where: { id: assignmentId, schoolId },
    select: { id: true },
  })
  if (!existing) throw new ApiError('Guidance assignment not found', 404)

  const updateResult = await prisma.guidanceAssignment.updateMany({
    where: { id: existing.id, schoolId },
    data: { active: false, revokedAt: new Date() },
  })
  if (updateResult.count === 0) throw new ApiError('Guidance assignment not found', 404)

  return NextResponse.json({ success: true })
})
