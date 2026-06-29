export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeQueryString } from '@/lib/security/safeQueryValue'

/**
 * GET /api/marketplace/mine
 *
 *  - default: the authenticated teacher's own submissions (any status).
 *  - ?scope=review (HOD/admin): the school's pending submissions to review.
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user.id)
  const scope = safeQueryString(new URL(request.url).searchParams.get('scope'), {
    defaultValue: '',
  }).toLowerCase()

  let where
  if (scope === 'review') {
    if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
      throw new ApiError('Forbidden', 403)
    }
    where = { schoolId, status: 'pending' }
  } else {
    where = { teacherId: userId }
  }

  const items = await prisma.sharedMaterial.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      type: true,
      sourceLessonPlanId: true,
      title: true,
      subject: true,
      form: true,
      topic: true,
      status: true,
      rejectionReason: true,
      downloadCount: true,
      rating: true,
      ratingCount: true,
      showAuthorName: true,
      createdAt: true,
      approvedAt: true,
      teacher: scope === 'review' ? { select: { name: true } } : false,
    },
  })

  return NextResponse.json({ success: true, data: { items, scope: scope || 'mine' } })
})
