export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveTeacherRecordId } from '@/lib/utils/resolveTeacherId'
import {
  mergeAllocationPayload,
  resyncApprovedDepartmentAllocation,
} from '@/lib/timetable/departmentAllocationMutations'

export const PUT = withErrorHandler(async function PUT(request, { params }) {
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

  const body = await request.json().catch(() => ({}))

  const result = await prisma.$transaction(async (tx) => {
    const allocation = await tx.departmentAllocation.findFirst({
      where: { id: allocationId, schoolId },
      select: {
        id: true,
        status: true,
        createdByUserId: true,
        allocationData: true,
      },
    })
    if (!allocation) throw new ApiError('Not found', 404)

    const current =
      allocation.allocationData && typeof allocation.allocationData === 'object'
        ? allocation.allocationData
        : {}

    let merged = mergeAllocationPayload(current, body)

    const teacherIdRaw = String(merged?.teacherId || '').trim()
    if (teacherIdRaw) {
      const resolvedTeacherId = await resolveTeacherRecordId(tx, schoolId, teacherIdRaw)
      if (!resolvedTeacherId) throw new ApiError('Teacher record not found for this school', 400)
      merged = { ...merged, teacherId: resolvedTeacherId }
    }

    const updated = await tx.departmentAllocation.update({
      where: { id: allocation.id },
      data: { allocationData: merged },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    let timetableResync = { resynced: false, count: 0 }
    if (allocation.status === 'APPROVED') {
      try {
        timetableResync = await resyncApprovedDepartmentAllocation(tx, {
          schoolId,
          allocation,
          mergedData: merged,
        })
      } catch (e) {
        throw new ApiError(String(e?.message || e || 'Timetable sync failed'), 400)
      }
    }

    return { updated, timetableResync }
  })

  return NextResponse.json({
    success: true,
    allocation: result.updated,
    timetableResynced: result.timetableResync.resynced,
    timetableAllocationsSynced: result.timetableResync.count || 0,
  })
})
