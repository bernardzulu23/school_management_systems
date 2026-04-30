export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const departmentId = String(searchParams.get('departmentId') || '').trim()

  const pending = await prisma.departmentAllocation.findMany({
    where: {
      schoolId,
      status: 'SUBMITTED',
      ...(departmentId ? { departmentId } : {}),
    },
    select: {
      id: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      submittedAt: true,
      createdAt: true,
    },
    orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    take: 2000,
  })

  return NextResponse.json({ success: true, allocations: pending })
})
