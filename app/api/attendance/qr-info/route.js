export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateAttendanceToken } from '@/lib/attendance/qr'
import { getEnrolledRoster } from '@/lib/attendance/sessions'

/**
 * GET /api/attendance/qr-info?t={token}
 * Public: session context + roster for the /attend mobile page.
 */
export const GET = withErrorHandler(async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = String(searchParams.get('t') || searchParams.get('token') || '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  let payload
  try {
    payload = validateAttendanceToken(token)
  } catch (e) {
    const message =
      e.name === 'TokenExpiredError'
        ? 'This QR code has expired. Ask your teacher for a new one.'
        : 'Invalid or expired QR code'
    const status = e.name === 'TokenExpiredError' ? 410 : 401
    return NextResponse.json({ error: message }, { status })
  }

  const session = await prisma.attendanceSession.findFirst({
    where: {
      id: payload.sessionId,
      schoolId: payload.schoolId,
      classId: payload.classId,
      subjectId: payload.subjectId,
      status: 'OPEN',
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      marks: {
        select: { studentId: true, status: true },
      },
    },
  })

  if (!session) {
    return NextResponse.json(
      { error: 'Attendance session is closed or not found' },
      { status: 404 }
    )
  }

  const roster = await getEnrolledRoster(payload.schoolId, payload.classId, payload.subjectId)
  const markedStudentIds = session.marks
    .filter((m) => ['PRESENT', 'LATE'].includes(String(m.status).toUpperCase()))
    .map((m) => m.studentId)

  return NextResponse.json({
    success: true,
    className: session.class?.name || null,
    subjectName: session.subject?.name || null,
    sessionId: session.id,
    roster: roster.map((s) => ({ id: s.id, name: s.name })),
    markedStudentIds,
  })
})
