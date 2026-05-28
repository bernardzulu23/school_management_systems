/**
 * Headteacher live attendance summary (today) with 60s in-memory cache.
 */
import prisma from '@/lib/prisma'
import { getHeadteacherLiveAttendance, getChronicAbsentees } from '@/lib/attendance/sessions'

const cache = new Map()

function todayUtcRange() {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end, dateStr: start.toISOString().slice(0, 10) }
}

/**
 * @param {string} schoolId
 * @param {{ refresh?: boolean }} opts
 */
export async function getAttendanceLiveSummary(schoolId, opts = {}) {
  const refresh = opts.refresh === true
  const hit = cache.get(schoolId)
  if (!refresh && hit && Date.now() - hit.at < 60_000) {
    return hit.data
  }

  const { start, end, dateStr } = todayUtcRange()

  const [totalClasses, totalStudents, sessionBlock, dailyRecords, classes] = await Promise.all([
    prisma.class.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId, classId: { not: null } } }),
    getHeadteacherLiveAttendance(schoolId),
    prisma.attendance.findMany({
      where: { schoolId, date: start },
      select: {
        status: true,
        student: { select: { classId: true, name: true, id: true } },
      },
    }),
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    }),
  ])

  let presentToday = 0
  let absentToday = 0
  let lateToday = 0
  const classesWithDaily = new Set()

  for (const r of dailyRecords) {
    const cid = r.student?.classId
    if (cid) classesWithDaily.add(String(cid))
    const st = String(r.status || '').toLowerCase()
    if (st === 'present') presentToday++
    else if (st === 'absent') absentToday++
    else if (st === 'late') lateToday++
  }

  const sessionClassIds = new Set(
    (sessionBlock.sessions || [])
      .map((s) => {
        const match = classes.find(
          (c) => c.name && s.className && String(c.name) === String(s.className)
        )
        return match?.id
      })
      .filter(Boolean)
  )

  const classesWithAttendance = new Set([...classesWithDaily, ...sessionClassIds])
  const classesNotStarted = Math.max(0, totalClasses - classesWithAttendance.size)

  const markedToday = presentToday + absentToday + lateToday
  const attendanceRate =
    markedToday > 0 ? Math.round(((presentToday + lateToday) / markedToday) * 1000) / 10 : 0

  const chronicRows = await getChronicAbsentees({
    schoolId,
    threshold: 3,
  }).catch(() => [])

  const chronicallyAbsent = (chronicRows || []).slice(0, 20).map((r) => ({
    studentId: r.studentId,
    studentName: r.studentName || r.name || 'Learner',
    subjectName: r.subjectName,
    absenceCount: r.absenceCount,
  }))

  const classRoster = classes.map((c) => ({
    classId: c.id,
    className: c.name,
    hasAttendance: classesWithAttendance.has(String(c.id)),
  }))

  const data = {
    todayDate: dateStr,
    totalClasses,
    classesWithAttendance: classesWithAttendance.size,
    classesNotStarted,
    totalStudents,
    presentToday,
    absentToday,
    lateToday,
    attendanceRate,
    schoolWideSessionRate: sessionBlock.schoolWideRate,
    chronicallyAbsent,
    sessions: sessionBlock.sessions || [],
    classes: classRoster,
  }

  cache.set(schoolId, { at: Date.now(), data })
  return data
}
