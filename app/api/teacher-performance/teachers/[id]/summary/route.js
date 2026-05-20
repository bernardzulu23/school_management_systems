import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getTeacherPerformance } from '@/lib/analytics/teacherPerformance'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const teacherUserId = String(routeParams?.id || '').trim()
  if (!teacherUserId) throw new ApiError('Teacher id is required', 400)

  const { searchParams } = new URL(request.url)
  const term = searchParams.get('term')
  const yearRaw = searchParams.get('year')
  const year = yearRaw ? Number(yearRaw) : null

  const data = await getTeacherPerformance({
    prisma,
    schoolId,
    teacherUserId,
    term,
    year,
  })

  return NextResponse.json({
    success: true,
    data: {
      summaries: data.summaries,
      overall_metrics: data.overall_metrics,
    },
  })
})
