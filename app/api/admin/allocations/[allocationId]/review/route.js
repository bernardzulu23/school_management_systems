export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveTeacherUserId } from '@/lib/utils/resolveTeacherId'

function unwrapAllocationData(data) {
  const raw = data && typeof data === 'object' ? data : {}
  const teacherId = String(raw?.teacherId || '').trim()
  const classes = Array.isArray(raw?.classes) ? raw.classes.map((c) => String(c).trim()) : []
  const subject = String(raw?.subject || '').trim()
  const periodConfig = raw?.periodConfig ?? null
  return { teacherId, classes: classes.filter(Boolean), subject, periodConfig }
}

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const allocationId = String(routeParams?.allocationId || '').trim()
  if (!allocationId) throw new ApiError('allocationId is required', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const allocation = await prisma.departmentAllocation.findFirst({
    where: { id: allocationId, schoolId },
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  })
  if (!allocation) throw new ApiError('Not found', 404)

  const details = unwrapAllocationData(allocation.allocationData)

  const teacherUser = await resolveTeacherUserId(prisma, schoolId, details.teacherId)

  return NextResponse.json({
    success: true,
    data: {
      id: allocation.id,
      departmentId: allocation.departmentId,
      department: allocation.department,
      status: allocation.status,
      teacherId: details.teacherId,
      teacherUserId: teacherUser?.id || null,
      teacherName: teacherUser?.name || null,
      classes: details.classes,
      subject: details.subject,
      periodConfig: details.periodConfig,
      createdBy: allocation.createdBy,
      submittedAt: allocation.submittedAt,
      rejectionReason: allocation.rejectionReason,
    },
  })
})
