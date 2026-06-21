export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { deleteDepartmentAllocationCascade } from '@/lib/timetable/departmentAllocationMutations'

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const routeParams = await params
  const allocationId = String(routeParams?.allocationId || '').trim()
  if (!allocationId) throw new ApiError('allocationId is required', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const allocation = await prisma.departmentAllocation.findFirst({
    where: { id: allocationId, schoolId },
    select: { id: true },
  })
  if (!allocation) throw new ApiError('Not found', 404)

  await prisma.$transaction(async (tx) => {
    await deleteDepartmentAllocationCascade(tx, schoolId, allocation.id)
  })

  return NextResponse.json({ success: true })
})
