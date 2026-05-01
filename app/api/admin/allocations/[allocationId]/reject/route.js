export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

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
    prisma.departmentAllocation.update({
      where: { id: allocation.id },
      data: {
        status: 'REJECTED',
        rejectionReason,
        approvedByUserId: auth.user.id,
        approvedAt: now,
      },
      select: { status: true, rejectionReason: true },
    }),
    prisma.allocationNotification.updateMany({
      where: { schoolId, allocationId: allocation.id, adminUserId: auth.user.id, read: false },
      data: { read: true, readAt: now },
    }),
  ])

  return NextResponse.json({ status: updated.status, rejectionReason: updated.rejectionReason })
})
