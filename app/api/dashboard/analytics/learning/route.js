export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  getHeadteacherLearningAnalytics,
  getHodLearningAnalytics,
  getStudentLearningAnalytics,
} from '@/lib/analytics/learning-analytics'

/**
 * GET /api/dashboard/analytics/learning
 * Query: term, academicYear, department (HOD)
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const academicYear = Number(searchParams.get('academicYear')) || new Date().getFullYear()
  const term = searchParams.get('term') ? Number(searchParams.get('term')) : undefined
  const department = searchParams.get('department') || ''
  const role = String(auth.user.role || '').toLowerCase()
  const opts = { academicYear, term }

  if (role === 'student') {
    const student = await import('@/lib/prisma').then((m) =>
      m.default.student.findFirst({
        where: { schoolId, userId: auth.user.id },
        select: { id: true },
      })
    )
    if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    const data = await getStudentLearningAnalytics(schoolId, student.id, opts)
    return NextResponse.json({ success: true, data })
  }

  if (role === 'hod') {
    const dept =
      department ||
      (await import('@/lib/prisma').then(async (m) => {
        const hod = await m.default.headOfDepartment.findFirst({
          where: { schoolId, userId: auth.user.id },
          select: { department: true },
        })
        return hod?.department || ''
      }))
    const data = await getHodLearningAnalytics(schoolId, dept, opts)
    return NextResponse.json({ success: true, data })
  }

  if (roleCheck(auth.user, ['headteacher', 'admin', 'administrator'])) {
    const data = await getHeadteacherLearningAnalytics(schoolId, opts)
    return NextResponse.json({ success: true, data })
  }

  if (roleCheck(auth.user, ['teacher'])) {
    const data = await getHeadteacherLearningAnalytics(schoolId, opts)
    return NextResponse.json({ success: true, data: { ...data, role: 'teacher', scoped: true } })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
})
