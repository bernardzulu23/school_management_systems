export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { canAccessResultsOverview, fetchResultsOverview } from '@/lib/dashboard/resultsOverview'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!canAccessResultsOverview(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const className = String(searchParams.get('class') || '').trim()
  const subjectName = String(searchParams.get('subject') || '').trim()
  const teacherUserId = String(searchParams.get('teacher') || '').trim()
  const resultType = String(searchParams.get('resultType') || '').trim()
  const limit = Number(searchParams.get('limit') || 200)

  const data = await fetchResultsOverview({
    prisma,
    schoolId,
    user: auth.user,
    className,
    subjectName,
    teacherUserId,
    resultType,
    limit,
  })

  return NextResponse.json({ success: true, ...data })
})
