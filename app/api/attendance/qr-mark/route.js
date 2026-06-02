export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateAttendanceToken, resolveStudentFromRoster } from '@/lib/attendance/qr'
import { getEnrolledRoster, recordAttendanceMark } from '@/lib/attendance/sessions'
import { applyRateLimit } from '@/lib/middleware/withRateLimit'

/**
 * POST /api/attendance/qr-mark
 * Student marks present via QR token (no auth cookie required).
 * BODY: { token, studentName? } or { token, studentId }
 */
export const POST = withErrorHandler(async function POST(request) {
  const limited = applyRateLimit(request, {
    limit: 30,
    windowMs: 60 * 1000,
    keyPrefix: 'qr_mark_',
  })
  if (limited) return limited

  const body = await request.json().catch(() => ({}))
  const token = String(body.token || '').trim()
  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  let payload
  try {
    payload = validateAttendanceToken(token)
  } catch (e) {
    const message =
      e.name === 'TokenExpiredError'
        ? 'This QR code has expired. Ask your teacher for a new one.'
        : 'Invalid or expired QR code'
    return NextResponse.json({ error: message }, { status: 401 })
  }

  const roster = await getEnrolledRoster(payload.schoolId, payload.classId, payload.subjectId)
  const student = resolveStudentFromRoster(roster, {
    studentId: body.studentId,
    studentName: body.studentName,
  })

  if (!student) {
    const hasName = Boolean(String(body.studentName || '').trim())
    const hasId = Boolean(String(body.studentId || '').trim())
    if (!hasName && !hasId) {
      return NextResponse.json({ error: 'studentName or studentId is required' }, { status: 400 })
    }
    return NextResponse.json(
      {
        error: hasName
          ? 'Name not found on class list. Check spelling or pick your name from the list.'
          : 'Student not enrolled in this class',
      },
      { status: 404 }
    )
  }

  const existing = await prisma.attendanceMark.findUnique({
    where: {
      sessionId_studentId: {
        sessionId: payload.sessionId,
        studentId: student.id,
      },
    },
    select: { status: true, markedAt: true },
  })

  if (existing && ['PRESENT', 'LATE'].includes(String(existing.status).toUpperCase())) {
    return NextResponse.json(
      {
        error: 'You are already marked for this lesson',
        studentName: student.name,
        markedAt: existing.markedAt,
      },
      { status: 409 }
    )
  }

  try {
    const mark = await recordAttendanceMark({
      sessionId: payload.sessionId,
      schoolId: payload.schoolId,
      studentId: student.id,
      method: 'COMMUNITY_TAP',
    })

    return NextResponse.json({
      success: true,
      studentName: student.name,
      status: mark.status,
      markedAt: mark.markedAt,
    })
  } catch (e) {
    if (e.code === 'TWIN_SECONDARY_AUTH_REQUIRED') {
      return NextResponse.json(
        { error: 'Additional verification required. See your teacher.', code: e.code },
        { status: 409 }
      )
    }
    if (e.status === 404) {
      return NextResponse.json(
        { error: e.message || 'Session not found or already closed' },
        { status: 404 }
      )
    }
    throw e
  }
})
