export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'
import { getHodProfile } from '@/lib/utils/hodDepartmentScope'
import { canManageDepartmentAllocations, isSchoolAdminOrHead } from '@/lib/utils/hodAccess'
import { assertHodSchoolAccess } from '@/lib/school/hodAccess'

async function assertCanAccessAllocation({ schoolId, user, allocation }) {
  if (isSchoolAdminOrHead(user)) return
  if (allocation.createdByUserId === user.id) return

  const hodProfile = await getHodProfile(prisma, user.id, schoolId)
  if (!canManageDepartmentAllocations(user, hodProfile)) {
    throw new ApiError('Forbidden', 403)
  }
  if (!hodProfile) throw new ApiError('Forbidden', 403)

  const resolved = await resolveDepartmentScope({
    prisma,
    schoolId,
    departmentId: hodProfile.departmentId,
    departmentName: hodProfile.department,
  })
  if (!resolved.departmentIds.includes(allocation.departmentId)) {
    throw new ApiError('Forbidden', 403)
  }
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const allocationId = String(routeParams?.allocationId || '').trim()
  if (!allocationId) throw new ApiError('allocationId is required', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertHodSchoolAccess(schoolId)

  const allocation = await prisma.departmentAllocation.findFirst({
    where: { id: allocationId, schoolId },
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      approvedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  })
  if (!allocation) throw new ApiError('Not found', 404)

  await assertCanAccessAllocation({ schoolId, user: auth.user, allocation })

  return NextResponse.json({ success: true, allocation })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const routeParams = await params
  const allocationId = String(routeParams?.allocationId || '').trim()
  if (!allocationId) throw new ApiError('allocationId is required', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertHodSchoolAccess(schoolId)

  const allocation = await prisma.departmentAllocation.findFirst({
    where: { id: allocationId, schoolId },
    select: { id: true, status: true, createdByUserId: true, departmentId: true },
  })
  if (!allocation) throw new ApiError('Not found', 404)

  if (allocation.createdByUserId !== auth.user.id) throw new ApiError('Forbidden', 403)
  const status = String(allocation.status || '').toUpperCase()
  if (status !== 'DRAFT' && status !== 'SUBMITTED') {
    throw new ApiError('Only draft or submitted allocations can be deleted', 400)
  }

  await prisma.departmentAllocation.delete({ where: { id: allocation.id } })

  return NextResponse.json({ success: true })
})
