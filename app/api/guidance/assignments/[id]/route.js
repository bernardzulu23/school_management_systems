export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeGuidanceAssignmentAdmin } from '@/lib/guidance/routeAuth'

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const routeParams = await params
  const authz = await authorizeGuidanceAssignmentAdmin(request)
  if (!authz.ok) return authz.response

  const { schoolId } = authz
  const assignmentId = String(routeParams?.id || '').trim()
  if (!assignmentId) throw new ApiError('Assignment id is required', 400)

  const existing = await prisma.guidanceAssignment.findFirst({
    where: { id: assignmentId, schoolId },
    select: { id: true },
  })
  if (!existing) throw new ApiError('Guidance assignment not found', 404)

  await prisma.guidanceAssignment.update({
    where: { id: existing.id },
    data: { active: false, revokedAt: new Date() },
  })

  return NextResponse.json({ success: true })
})
