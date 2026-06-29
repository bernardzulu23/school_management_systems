export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile } from '@/lib/utils/hodDepartmentScope'
import { canManageDepartmentAllocations } from '@/lib/utils/hodAccess'
import { assertHodSchoolAccess } from '@/lib/school/hodAccess'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

function adminRoleWhere() {
  const values = ['headteacher', 'admin', 'administrator', 'superadmin']
  return {
    OR: values.map((v) => ({ role: { equals: v, mode: 'insensitive' } })),
  }
}

export const POST = withErrorHandler(async function POST(request, { params }) {
  const allocationId = await safeRouteParam(params, 'allocationId')
  if (!allocationId) throw new ApiError('allocationId is required', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertHodSchoolAccess(schoolId)

  const hodProfile = await getHodProfile(prisma, auth.user.id, schoolId)
  if (!canManageDepartmentAllocations(auth.user, hodProfile)) {
    throw new ApiError('Forbidden', 403)
  }

  const allocation = await prisma.departmentAllocation.findFirst({
    where: { id: allocationId, schoolId },
    select: { id: true, status: true, createdByUserId: true },
  })
  if (!allocation) throw new ApiError('Not found', 404)
  if (allocation.createdByUserId !== auth.user.id) throw new ApiError('Forbidden', 403)
  if (allocation.status !== 'DRAFT' && allocation.status !== 'REJECTED') {
    throw new ApiError('Only DRAFT or REJECTED allocations can be submitted', 400)
  }

  const submittedAt = new Date()

  const [updated, admins] = await prisma.$transaction([
    prisma.departmentAllocation.update({
      where: { id: allocation.id },
      data: {
        status: 'SUBMITTED',
        submittedAt,
        rejectionReason: null,
        approvedByUserId: null,
        approvedAt: null,
      },
      select: { id: true, status: true, submittedAt: true },
    }),
    prisma.user.findMany({
      where: { schoolId, ...adminRoleWhere() },
      select: { id: true },
      take: 2000,
    }),
  ])

  if (admins.length > 0) {
    await prisma.allocationNotification.createMany({
      data: admins.map((a) => ({
        schoolId,
        allocationId: updated.id,
        adminUserId: a.id,
      })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ status: updated.status, submittedAt: updated.submittedAt })
})
