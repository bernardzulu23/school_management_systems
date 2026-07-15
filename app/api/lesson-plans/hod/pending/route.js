import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  const role = String(auth.user?.role || '').toLowerCase()
  const isHod =
    role === 'hod' || roleCheck(auth.user, ['HOD', 'hod']) || Boolean(auth.user?.hodProfile)
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])

  if (!isHod && !isAdmin) throw new ApiError('HOD access required', 403)

  const pending = await prisma.lessonPlan.findMany({
    where: {
      schoolId,
      status: 'SUBMITTED',
      ...(isAdmin ? {} : { reviewerUserId: userId }),
    },
    orderBy: { submittedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      status: true,
      grade: true,
      subject: true,
      topic: true,
      subTopic: true,
      duration: true,
      term: true,
      submittedAt: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    success: true,
    data: { pending, count: pending.length },
  })
})
