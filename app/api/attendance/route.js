export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { scheduleParentAttendanceSmsBatch } from '@/lib/attendance/parentNotifications'
import { mergeAttendanceRegister } from '@/lib/attendance/unified-register'
import { syncWebAttendanceToSession } from '@/lib/compliance/attendanceToday'
import { openAttendanceSession, recordAttendanceMark } from '@/lib/attendance/sessions'
import { bulkUpsertAttendance } from '@/lib/attendance/bulkUpsert'
import { assertTeacherTeachesClassSubject } from '@/lib/assignments/routeScope'
import { assertTeacherMayAccessAttendanceClass } from '@/lib/attendance/routeAuth'
import { safeStringId } from '@/lib/security/safeQueryValue'
import { roleCheck } from '@/lib/middleware/auth'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const classId = safeStringId(searchParams.get('classId'))
  const dateStr = safeStringId(searchParams.get('date'))
  const subjectId = safeStringId(searchParams.get('subjectId')) || undefined
  const legacyOnly = searchParams.get('legacyOnly') === '1'

  if (!classId || !dateStr) {
    return NextResponse.json({ error: 'classId and date are required' }, { status: 400 })
  }

  await assertTeacherMayAccessAttendanceClass({ schoolId, user: auth.user, classId })

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  if (legacyOnly) {
    const normalized = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    )
    const students = await prisma.student.findMany({
      where: { schoolId, classId },
      select: { id: true },
    })
    const ids = students.map((s) => s.id)
    if (ids.length === 0) return NextResponse.json({ success: true, data: [] })
    const records = await prisma.attendance.findMany({
      where: { schoolId, date: normalized, studentId: { in: ids } },
      select: { studentId: true, status: true, remarks: true },
    })
    return NextResponse.json({ success: true, data: records })
  }

  const merged = await mergeAttendanceRegister({ schoolId, classId, dateStr, subjectId })

  return NextResponse.json({
    success: true,
    data: merged.records,
    sessions: merged.sessions,
    meta: merged.meta,
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rawBody = await request.json().catch(() => ({}))

  // Handle both { date, records: [] } and directly [ { studentId, date, status, remarks }, ... ]
  let dateStr = ''
  let records = []

  if (Array.isArray(rawBody)) {
    records = rawBody
  } else {
    dateStr = String(rawBody?.date || '')
    records = Array.isArray(rawBody?.records) ? rawBody.records : []
  }

  if (records.length === 0)
    return NextResponse.json({ error: 'records are required' }, { status: 400 })

  const classId = safeStringId(rawBody?.classId)
  let subjectId = safeStringId(rawBody?.subjectId)
  if (classId) {
    await assertTeacherMayAccessAttendanceClass({ schoolId, user: auth.user, classId })
  }
  if (classId && subjectId) {
    await assertTeacherTeachesClassSubject({
      schoolId,
      user: auth.user,
      classId,
      subjectId,
    })
  }

  const validStatuses = ['present', 'absent', 'late', 'excused']

  const writes = records
    .map((r) => {
      const rDateStr = r.date || dateStr
      if (!rDateStr) return null

      const date = new Date(rDateStr)
      if (Number.isNaN(date.getTime())) return null

      const normalized = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      )

      const status = String(r?.status || '').toLowerCase()
      if (!validStatuses.includes(status)) return { error: `Invalid status: ${status}` }

      const studentId = safeStringId(r?.studentId)
      if (!studentId) return null

      return {
        studentId,
        status,
        remarks: r?.remarks !== undefined ? String(r.remarks || '') : null,
        date: normalized,
      }
    })
    .filter(Boolean)

  const firstError = writes.find((w) => w.error)
  if (firstError) return NextResponse.json({ error: firstError.error }, { status: 400 })

  const finalWrites = writes.filter((w) => w.studentId && w.status && w.date)

  if (finalWrites.length === 0) {
    return NextResponse.json({ error: 'No valid records' }, { status: 400 })
  }

  const existingRows = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: finalWrites[0].date,
      studentId: { in: finalWrites.map((w) => w.studentId) },
    },
    select: { studentId: true, status: true },
  })
  const existingByStudent = new Map(
    existingRows.map((r) => [String(r.studentId), String(r.status || '').toLowerCase()])
  )

  await bulkUpsertAttendance(prisma, schoolId, finalWrites)

  const changedWrites = finalWrites.filter(
    (w) =>
      String(existingByStudent.get(String(w.studentId)) || '') !== String(w.status).toLowerCase()
  )

  scheduleParentAttendanceSmsBatch({
    marks: changedWrites.map((r) => ({
      studentId: r.studentId,
      status: r.status,
      date: r.date,
    })),
    schoolId,
    sessionId: null,
    date: new Date(),
  })

  if (classId && !subjectId) {
    const assignment = await prisma.teachingAssignment.findFirst({
      where: { schoolId, classId, teacher: { userId: auth.user.id } },
      select: { subjectId: true },
    })
    subjectId = assignment?.subjectId || ''
  }

  let sessionSync = null
  if (classId && subjectId) {
    try {
      sessionSync = await syncWebAttendanceToSession({
        schoolId,
        teacherUserId: auth.user.id,
        classId,
        subjectId,
        records: finalWrites,
        openAttendanceSession,
        recordAttendanceMark,
      })
    } catch (err) {
      console.warn('Web attendance session sync failed:', err?.message || err)
    }
  }

  return NextResponse.json({ success: true, sms: { queued: true }, sessionSync })
})
