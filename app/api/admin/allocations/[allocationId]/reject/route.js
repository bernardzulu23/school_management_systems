export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const POST = withErrorHandler(async function POST(request, { params }) {
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
  const rejectionReason = String(body?.rejectionReason || '').trim()
  if (!rejectionReason) throw new ApiError('rejectionReason is required', 400)

  const allocation = await prisma.departmentAllocation.findFirst({
    where: { id: allocationId, schoolId },
    select: { id: true, status: true },
  })
  if (!allocation) throw new ApiError('Not found', 404)
  if (allocation.status !== 'SUBMITTED') {
    throw new ApiError('Only SUBMITTED allocations can be rejected', 400)
  }

  const now = new Date()

  const [updated] = await prisma.$transaction([
    prisma.departmentAllocation.updateMany({
      where: { id: allocation.id, schoolId },
      data: {
        status: 'REJECTED',
        rejectionReason,
        approvedByUserId: auth.user.id,
        approvedAt: now,
      },
    }),
    prisma.allocationNotification.updateMany({
      where: { schoolId, allocationId: allocation.id, adminUserId: auth.user.id, read: false },
      data: { read: true, readAt: now },
    }),
  ])

  if (updated.count === 0) throw new ApiError('Not found', 404)

  const row = await prisma.departmentAllocation.findFirst({
    where: { id: allocation.id, schoolId },
    select: { status: true, rejectionReason: true },
  })

  return NextResponse.json({ status: row.status, rejectionReason: row.rejectionReason })
})
