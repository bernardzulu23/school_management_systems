import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getHodTeacherPerformance } from '@/lib/analytics/hodTeacherPerformance'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const term = searchParams.get('term')
  const yearRaw = searchParams.get('year')
  const year = yearRaw ? Number(yearRaw) : null

  const data = await getHodTeacherPerformance({ prisma, schoolId, userId, term, year })

  const totals = data.teacherPerformance.reduce(
    (acc, t) => {
      acc.resultsEntered += Number(t.resultsEntered) || 0
      acc.sumAvg += Number(t.averageScore) || 0
      return acc
    },
    { resultsEntered: 0, sumAvg: 0 }
  )

  const stats = {
    totalTeachers: data.teacherPerformance.length,
    totalResultsEntered: totals.resultsEntered,
    averagePerformance: data.teacherPerformance.length
      ? Math.round(totals.sumAvg / data.teacherPerformance.length)
      : 0,
  }

  return NextResponse.json({ success: true, data: { ...data, stats } })
})
