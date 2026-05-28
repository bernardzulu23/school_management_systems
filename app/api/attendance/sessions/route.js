export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { getSessionsForClassDate } from '@/lib/attendance/unified-register'

/**
 * GET /api/attendance/sessions?classId=&date=YYYY-MM-DD&subjectId=
 * Lists mobile lesson sessions for the unified web attendance dashboard.
 */
export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const classId = String(searchParams.get('classId') || '').trim()
  const dateStr = String(searchParams.get('date') || '').trim()
  const subjectId = String(searchParams.get('subjectId') || '').trim() || undefined

  if (!classId || !dateStr) {
    return NextResponse.json({ error: 'classId and date are required' }, { status: 400 })
  }

  const sessions = await getSessionsForClassDate({ schoolId, classId, dateStr, subjectId })

  return NextResponse.json({
    success: true,
    data: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      periodLabel: s.periodLabel,
      verificationMethod: s.verificationMethod,
      subjectId: s.subjectId,
      subjectName: s.subject?.name,
      className: s.class?.name,
      teacherName: s.teacher?.name,
      marks: (s.marks || []).map((m) => ({
        studentId: m.studentId,
        status: String(m.status).toLowerCase(),
        method: m.method,
        markedAt: m.markedAt,
      })),
    })),
  })
})
