export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { openAttendanceSession } from '@/lib/attendance/sessions'
import { generateAttendanceQR } from '@/lib/attendance/qr'
import { getBaseUrlFromRequest } from '@/lib/sms'

/**
 * POST /api/attendance/qr-generate
 * Teacher starts a QR attendance session. Returns QR image and session details.
 * BODY: { classId, subjectId, periodLabel?, term?, academicYear?, shift? }
 */
export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const classId = String(body.classId || '').trim()
  const subjectId = String(body.subjectId || '').trim()
  if (!classId || !subjectId) {
    return NextResponse.json({ error: 'classId and subjectId are required' }, { status: 400 })
  }

  const session = await openAttendanceSession({
    schoolId,
    teacherUserId: auth.user.id,
    classId,
    subjectId,
    periodLabel: body.periodLabel || null,
    term: body.term,
    academicYear: body.academicYear || null,
    shift: body.shift || 'SINGLE',
    verificationMethod: 'COMMUNITY_TAP',
    lateAfterMinutes: body.lateAfterMinutes,
  })

  const baseUrl = getBaseUrlFromRequest(request).replace(/\/+$/, '')
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Could not determine portal URL for QR code' },
      { status: 400 }
    )
  }

  const qr = await generateAttendanceQR({
    sessionId: session.id,
    schoolId,
    classId,
    subjectId,
    teacherId: auth.user.id,
    baseUrl,
  })

  const presentCount = (session.marks || []).filter((m) =>
    ['PRESENT', 'LATE'].includes(String(m.status).toUpperCase())
  ).length

  return NextResponse.json({
    success: true,
    qrDataUrl: qr.qrDataUrl,
    sessionId: session.id,
    expiresAt: qr.expiresAt.toISOString(),
    attendanceUrl: qr.attendanceUrl,
    token: qr.token,
    className: session.class?.name || null,
    subjectName: session.subject?.name || null,
    presentCount,
    totalMarks: (session.marks || []).length,
  })
})
