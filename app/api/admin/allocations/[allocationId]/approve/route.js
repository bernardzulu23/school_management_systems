export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function unwrapAllocationData(data) {
  const raw = data && typeof data === 'object' ? data : {}
  const teacherId = String(raw?.teacherId || '').trim()
  const classes = Array.isArray(raw?.classes) ? raw.classes.map((c) => String(c).trim()) : []
  const subject = String(raw?.subject || '').trim()
  const periodConfig = raw?.periodConfig ?? null
  return { teacherId, classes: classes.filter(Boolean), subject, periodConfig }
}

export const POST = withErrorHandler(async function POST(request, { params }) {
  const routeParams = await params
  const allocationId = String(routeParams?.allocationId || '').trim()
  if (!allocationId) throw new ApiError('allocationId is required', 400)

  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const allocation = await tx.departmentAllocation.findFirst({
      where: { id: allocationId, schoolId },
      select: { id: true, status: true, departmentId: true, allocationData: true },
    })
    if (!allocation) throw new ApiError('Not found', 404)
    if (allocation.status !== 'SUBMITTED') {
      throw new ApiError('Only SUBMITTED allocations can be approved', 400)
    }

    const details = unwrapAllocationData(allocation.allocationData)
    if (!details.teacherId) throw new ApiError('Allocation missing teacherId', 400)
    if (!details.subject) throw new ApiError('Allocation missing subject', 400)
    if (details.classes.length === 0) throw new ApiError('Allocation missing classes', 400)

    const periodConfiguration =
      typeof details.periodConfig === 'string'
        ? details.periodConfig
        : JSON.stringify(details.periodConfig ?? {})

    const updated = await tx.departmentAllocation.update({
      where: { id: allocation.id },
      data: {
        status: 'APPROVED',
        approvedByUserId: auth.user.id,
        approvedAt: now,
        rejectionReason: null,
      },
      select: { id: true, status: true, approvedAt: true },
    })

    const masterEntry = await tx.masterTimetableEntry.create({
      data: {
        schoolId,
        departmentId: allocation.departmentId,
        allocationId: allocation.id,
        teacherId: details.teacherId,
        classes: details.classes,
        subject: details.subject,
        periodConfiguration,
      },
      select: { id: true, insertedAt: true },
    })

    return { updated, masterEntry }
  })

  return NextResponse.json({
    status: result.updated.status,
    insertedAt: result.masterEntry.insertedAt,
    masterEntryId: result.masterEntry.id,
  })
})
