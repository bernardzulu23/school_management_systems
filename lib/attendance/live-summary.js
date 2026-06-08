/**
 * Headteacher live attendance summary (today) with 60s in-memory cache.
 */
import prisma from '@/lib/prisma'
import { getHeadteacherLiveAttendance, getChronicAbsentees } from '@/lib/attendance/sessions'

const cache = new Map()

const LUSAKA_TZ = 'Africa/Lusaka'
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function lusakaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: LUSAKA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  })
  const parts = fmt.formatToParts(date)
  const pick = (type) => parts.find((p) => p.type === type)?.value || ''
  const hour = Number(pick('hour'))
  const minute = Number(pick('minute'))
  const weekday = pick('weekday')
  return {
    weekday,
    minutes: hour * 60 + minute,
  }
}

function parseClockToMinutes(value) {
  const raw = String(value || '').trim()
  const m = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function normalizeDay(day) {
  return String(day || '')
    .trim()
    .toLowerCase()
    .slice(0, 3)
}

/**
 * Resolve the current teaching period from bell schedule (TimeSlot rows).
 * @param {Array<{ dayOfWeek: string, startTime: string, endTime: string, period: number, isBreak?: boolean, label?: string }>} timeSlots
 * @param {Date} [now]
 */
export function resolveCurrentPeriod(timeSlots, now = new Date()) {
  const { weekday, minutes } = lusakaParts(now)
  const dayKey = normalizeDay(weekday)
  const teachingSlots = (timeSlots || [])
    .filter((s) => !s.isBreak)
    .filter((s) => {
      const slotDay = normalizeDay(s.dayOfWeek)
      return slotDay === dayKey || String(s.dayOfWeek).toLowerCase() === weekday.toLowerCase()
    })
    .map((s) => ({
      ...s,
      startMin: parseClockToMinutes(s.startTime),
      endMin: parseClockToMinutes(s.endTime),
    }))
    .filter((s) => s.startMin != null && s.endMin != null)
    .sort((a, b) => a.startMin - b.startMin)

  const current = teachingSlots.find((s) => minutes >= s.startMin && minutes < s.endMin)
  if (!current) {
    const next = teachingSlots.find((s) => s.startMin > minutes)
    return {
      period: null,
      label: null,
      timeRange: null,
      isActive: false,
      nextPeriod: next?.period ?? null,
      nextTimeRange: next ? `${next.startTime}–${next.endTime}` : null,
      weekday,
      localTime: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    }
  }

  const periodNum = Number(current.period) || null
  const label = current.label || (periodNum != null ? `Period ${periodNum}` : 'Current period')

  return {
    period: periodNum,
    label,
    timeRange: `${current.startTime}–${current.endTime}`,
    isActive: true,
    nextPeriod: null,
    nextTimeRange: null,
    weekday,
    localTime: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
  }
}

function sessionMatchesCurrentPeriod(session, currentPeriod) {
  if (!currentPeriod?.period) return false
  const label = String(session?.periodLabel || '').toLowerCase()
  const periodStr = String(currentPeriod.period)
  return (
    label.includes(`period ${periodStr}`) ||
    label.includes(`p${periodStr}`) ||
    label === periodStr ||
    label.startsWith(`${periodStr} `)
  )
}

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

  const [totalClasses, totalStudents, sessionBlock, dailyRecords, classes, timeSlots] =
    await Promise.all([
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
      prisma.timeSlot.findMany({
        where: { schoolId },
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          period: true,
          isBreak: true,
          label: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
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

  const currentPeriod = resolveCurrentPeriod(timeSlots)
  const sessions = (sessionBlock.sessions || []).map((s) => ({
    ...s,
    isCurrentPeriod: sessionMatchesCurrentPeriod(s, currentPeriod),
  }))

  const data = {
    todayDate: dateStr,
    currentPeriod,
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
    sessions,
    classes: classRoster,
  }

  cache.set(schoolId, { at: Date.now(), data })
  return data
}
