export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile } from '@/lib/utils/hodDepartmentScope'
import { canManageDepartmentAllocations } from '@/lib/utils/hodAccess'
import { assertHodSchoolAccess } from '@/lib/school/hodAccess'
import { resolveTeacherRecordId } from '@/lib/utils/resolveTeacherId'
import { mergeAllocationPayload } from '@/lib/timetable/departmentAllocationMutations'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const PUT = withErrorHandler(async function PUT(request, { params }) {
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
    select: { id: true, status: true, createdByUserId: true, allocationData: true },
  })
  if (!allocation) throw new ApiError('Not found', 404)
  if (allocation.createdByUserId !== auth.user.id) throw new ApiError('Forbidden', 403)
  const status = String(allocation.status || '').toUpperCase()
  if (status !== 'DRAFT' && status !== 'REJECTED' && status !== 'SUBMITTED') {
    throw new ApiError(
      'Only draft, rejected, or submitted allocations can be updated. Contact the Headteacher to change approved allocations.',
      400
    )
  }

  const body = await request.json().catch(() => ({}))

  const current =
    allocation.allocationData && typeof allocation.allocationData === 'object'
      ? allocation.allocationData
      : {}

  let merged = mergeAllocationPayload(current, body)

  const teacherIdRaw = String(merged?.teacherId || '').trim()
  if (teacherIdRaw) {
    const resolvedTeacherId = await resolveTeacherRecordId(prisma, schoolId, teacherIdRaw)
    if (!resolvedTeacherId) throw new ApiError('Teacher record not found for this school', 400)
    merged = { ...merged, teacherId: resolvedTeacherId }
  }

  const updated = await prisma.departmentAllocation.update({
    where: { id: allocation.id },
    data: { allocationData: merged },
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      approvedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  return NextResponse.json({ success: true, allocation: updated })
})
