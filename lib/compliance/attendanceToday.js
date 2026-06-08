import prisma from '@/lib/prisma'
import { getDayBounds } from '@/lib/attendance/unified-register'

/** When true, only teachers scheduled on today's timetable are expected to take attendance. */
export const ATTENDANCE_COMPLIANCE_USE_TIMETABLE = false

const LUSAKA_TZ = 'Africa/Lusaka'

export function todayDateStrLusaka(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LUSAKA_TZ }).format(date)
}

function mapStatusToSession(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'late') return 'LATE'
  if (s === 'absent') return 'ABSENT'
  if (s === 'excused') return 'EXCUSED'
  return 'PRESENT'
}

/**
 * Resolve which teachers completed attendance today (sessions + legacy daily register).
 * Timetable engagement is intentionally skipped until conflict-free generation is reliable.
 *
 * @param {string} schoolId
 * @param {Array<{ id: string, userId: string, user?: { name?: string } }>} teachers
 */
export async function resolveTeachersAttendanceToday(schoolId, teachers) {
  const dateStr = todayDateStrLusaka()
  const bounds = getDayBounds(dateStr)
  if (!bounds || teachers.length === 0) {
    return {
      dateStr,
      completed: [],
      missing: [],
      byUserId: new Map(),
      useTimetableEngagement: ATTENDANCE_COMPLIANCE_USE_TIMETABLE,
    }
  }

  const userIds = teachers.map((t) => t.userId).filter(Boolean)
  const teacherIds = teachers.map((t) => t.id)

  const [sessions, assignments, homeroomClasses, dailyRows] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: {
        schoolId,
        startedAt: { gte: bounds.start, lt: bounds.end },
      },
      select: {
        id: true,
        teacherId: true,
        classId: true,
        subjectId: true,
        _count: { select: { marks: true } },
      },
    }),
    prisma.teachingAssignment.findMany({
      where: { schoolId, teacherId: { in: teacherIds } },
      select: { teacherId: true, classId: true, subjectId: true },
    }),
    prisma.class.findMany({
      where: { schoolId, teacherId: { in: teacherIds } },
      select: { id: true, teacherId: true },
    }),
    prisma.attendance.findMany({
      where: { schoolId, date: bounds.start },
      select: { student: { select: { classId: true } } },
    }),
  ])

  const classesWithDaily = new Set(
    dailyRows
      .map((r) => r.student?.classId)
      .filter(Boolean)
      .map(String)
  )

  const classIdsByTeacherId = new Map()
  for (const a of assignments) {
    if (!classIdsByTeacherId.has(a.teacherId)) classIdsByTeacherId.set(a.teacherId, new Set())
    classIdsByTeacherId.get(a.teacherId).add(String(a.classId))
  }
  for (const c of homeroomClasses) {
    if (!c.teacherId) continue
    if (!classIdsByTeacherId.has(c.teacherId)) classIdsByTeacherId.set(c.teacherId, new Set())
    classIdsByTeacherId.get(c.teacherId).add(String(c.id))
  }

  const sessionCountByUser = new Map()
  for (const s of sessions) {
    if (!s.teacherId) continue
    const prev = sessionCountByUser.get(s.teacherId) || { sessions: 0, marks: 0 }
    prev.sessions += 1
    prev.marks += s._count?.marks || 0
    sessionCountByUser.set(s.teacherId, prev)
  }

  const byUserId = new Map()
  const completed = []
  const missing = []

  for (const t of teachers) {
    const uid = t.userId
    const name = t.user?.name || 'Unknown teacher'
    let method = null
    let detail = null

    const sessionStats = sessionCountByUser.get(uid)
    if (sessionStats && sessionStats.sessions > 0) {
      method = 'session'
      detail = `${sessionStats.sessions} session(s), ${sessionStats.marks} mark(s)`
    } else {
      const classIds = classIdsByTeacherId.get(t.id) || new Set()
      const dailyClasses = [...classIds].filter((cid) => classesWithDaily.has(cid))
      if (dailyClasses.length > 0) {
        method = 'daily'
        detail = `Class register saved for ${dailyClasses.length} class(es)`
      }
    }

    const hasAttendance = Boolean(method)
    byUserId.set(uid, { completed: hasAttendance, method, detail })

    if (hasAttendance) {
      completed.push({
        teacherId: t.id,
        userId: uid,
        name,
        method,
        detail,
      })
    } else {
      missing.push({
        teacherId: t.id,
        userId: uid,
        name,
        reason: 'No attendance recorded today',
      })
    }
  }

  return {
    dateStr,
    completed,
    missing,
    byUserId,
    useTimetableEngagement: ATTENDANCE_COMPLIANCE_USE_TIMETABLE,
  }
}

/**
 * Link a web attendance save to an AttendanceSession so the teacher is credited.
 */
export async function syncWebAttendanceToSession({
  schoolId,
  teacherUserId,
  classId,
  subjectId,
  records,
  openAttendanceSession,
  recordAttendanceMark,
}) {
  if (!schoolId || !teacherUserId || !classId || !subjectId || !records?.length) {
    return { sessionId: null, synced: 0 }
  }

  const session = await openAttendanceSession({
    schoolId,
    teacherUserId,
    classId,
    subjectId,
    periodLabel: null,
    verificationMethod: 'MANUAL',
  })

  let synced = 0
  for (const r of records) {
    const studentId = String(r.studentId || '')
    if (!studentId) continue
    await recordAttendanceMark({
      sessionId: session.id,
      schoolId,
      studentId,
      method: 'MANUAL',
      statusOverride: mapStatusToSession(r.status),
    })
    synced += 1
  }

  return { sessionId: session.id, synced }
}
