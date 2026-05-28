import prisma from '@/lib/prisma'

/** @typedef {'present'|'absent'|'late'|'excused'} DailyStatus */

/**
 * UTC midnight bounds for a calendar date (YYYY-MM-DD).
 */
export function getDayBounds(dateStr) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export function normalizeDateUtc(dateStr) {
  const bounds = getDayBounds(dateStr)
  if (!bounds) return null
  return bounds.start
}

/** @param {string} status */
export function sessionStatusToDaily(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'PRESENT') return 'present'
  if (s === 'LATE') return 'late'
  if (s === 'ABSENT') return 'absent'
  if (s === 'EXCUSED') return 'excused'
  return 'present'
}

/**
 * Lesson sessions for a class on a given date (optionally filtered by subject).
 */
export async function getSessionsForClassDate({ schoolId, classId, dateStr, subjectId }) {
  const bounds = getDayBounds(dateStr)
  if (!bounds) return []

  return prisma.attendanceSession.findMany({
    where: {
      schoolId,
      classId,
      startedAt: { gte: bounds.start, lt: bounds.end },
      ...(subjectId ? { subjectId } : {}),
    },
    include: {
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      marks: {
        select: {
          studentId: true,
          status: true,
          method: true,
          markedAt: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  })
}

/**
 * Latest session mark per student for class (+ optional subject) on a date.
 */
export async function getSessionMarksByStudent({ schoolId, classId, dateStr, subjectId }) {
  const sessions = await getSessionsForClassDate({ schoolId, classId, dateStr, subjectId })
  /** @type {Map<string, object>} */
  const byStudent = new Map()

  for (const session of sessions) {
    for (const mark of session.marks || []) {
      const sid = String(mark.studentId)
      const prev = byStudent.get(sid)
      const markedAt = mark.markedAt ? new Date(mark.markedAt).getTime() : 0
      const prevAt = prev?.markedAt ? new Date(prev.markedAt).getTime() : 0
      if (!prev || markedAt >= prevAt) {
        byStudent.set(sid, {
          studentId: sid,
          status: sessionStatusToDaily(mark.status),
          sessionStatus: String(mark.status).toUpperCase(),
          source: 'session',
          sessionId: session.id,
          sessionStatusLabel: session.status,
          subjectId: session.subjectId,
          subjectName: session.subject?.name || null,
          method: mark.method,
          markedAt: mark.markedAt,
          periodLabel: session.periodLabel,
          verificationMethod: session.verificationMethod,
        })
      }
    }
  }

  return { sessions, byStudent }
}

export async function getDailyRecords({ schoolId, classId, dateStr }) {
  const normalized = normalizeDateUtc(dateStr)
  if (!normalized) return []

  const students = await prisma.student.findMany({
    where: { schoolId, classId },
    select: { id: true },
  })
  const ids = students.map((s) => s.id)
  if (!ids.length) return []

  const records = await prisma.attendance.findMany({
    where: { schoolId, date: normalized, studentId: { in: ids } },
    select: { studentId: true, status: true, remarks: true, updatedAt: true },
  })

  return records.map((r) => ({
    studentId: String(r.studentId),
    status: String(r.status || 'present').toLowerCase(),
    remarks: r.remarks,
    source: 'daily',
    updatedAt: r.updatedAt,
  }))
}

/**
 * Merge daily register with mobile lesson-session marks for the web dashboard.
 * When subjectId is set, session marks for that subject take precedence over daily rows.
 */
export async function mergeAttendanceRegister({ schoolId, classId, dateStr, subjectId }) {
  const [dailyRows, sessionData] = await Promise.all([
    getDailyRecords({ schoolId, classId, dateStr }),
    getSessionMarksByStudent({ schoolId, classId, dateStr, subjectId: subjectId || undefined }),
  ])

  const dailyByStudent = new Map(dailyRows.map((r) => [r.studentId, r]))
  const studentIds = new Set([...dailyByStudent.keys(), ...sessionData.byStudent.keys()])

  const records = []
  for (const studentId of studentIds) {
    const sessionRow = sessionData.byStudent.get(studentId)
    const dailyRow = dailyByStudent.get(studentId)

    if (subjectId && sessionRow) {
      records.push({
        studentId,
        status: sessionRow.status,
        remarks: dailyRow?.remarks ?? null,
        source: 'session',
        session: {
          sessionId: sessionRow.sessionId,
          subjectName: sessionRow.subjectName,
          method: sessionRow.method,
          sessionStatus: sessionRow.sessionStatus,
        },
      })
      continue
    }

    if (dailyRow) {
      records.push({
        studentId,
        status: dailyRow.status,
        remarks: dailyRow.remarks,
        source: dailyRow.source,
        session: sessionRow
          ? {
              sessionId: sessionRow.sessionId,
              subjectName: sessionRow.subjectName,
              status: sessionRow.status,
              method: sessionRow.method,
            }
          : null,
      })
      continue
    }

    if (sessionRow) {
      records.push({
        studentId,
        status: sessionRow.status,
        remarks: null,
        source: 'session',
        session: {
          sessionId: sessionRow.sessionId,
          subjectName: sessionRow.subjectName,
          method: sessionRow.method,
          sessionStatus: sessionRow.sessionStatus,
        },
      })
    }
  }

  const sessionsSummary = sessionData.sessions.map((s) => ({
    id: s.id,
    status: s.status,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    periodLabel: s.periodLabel,
    subjectId: s.subjectId,
    subjectName: s.subject?.name,
    className: s.class?.name,
    teacherName: s.teacher?.name,
    verificationMethod: s.verificationMethod,
    markCount: (s.marks || []).length,
    present: (s.marks || []).filter((m) => String(m.status).toUpperCase() === 'PRESENT').length,
    late: (s.marks || []).filter((m) => String(m.status).toUpperCase() === 'LATE').length,
    absent: (s.marks || []).filter((m) => String(m.status).toUpperCase() === 'ABSENT').length,
  }))

  return {
    records,
    sessions: sessionsSummary,
    meta: {
      date: dateStr,
      classId,
      subjectId: subjectId || null,
      dailyCount: dailyRows.length,
      sessionMarkCount: sessionData.byStudent.size,
      sessionCount: sessionsSummary.length,
    },
  }
}

/**
 * Copy closed session marks into the legacy daily Attendance table (DEBO / web register parity).
 */
export async function mirrorSessionMarksToDaily({ schoolId, sessionId }) {
  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, schoolId },
    include: { marks: true },
  })
  if (!session || !session.marks?.length) return { mirrored: 0 }

  const normalized = normalizeDateUtc(session.startedAt.toISOString().slice(0, 10))
  if (!normalized) return { mirrored: 0 }

  const writes = session.marks.map((m) => ({
    studentId: m.studentId,
    status: sessionStatusToDaily(m.status),
    remarks: m.remarks ?? null,
    date: normalized,
  }))

  await prisma.$transaction(
    writes.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: r.date } },
        create: {
          schoolId,
          studentId: r.studentId,
          date: r.date,
          status: r.status,
          remarks: r.remarks,
        },
        update: {
          status: r.status,
          remarks: r.remarks,
        },
      })
    )
  )

  return { mirrored: writes.length }
}
