/**
 * Phase 3 domain integrations — best-effort notification triggers.
 * Never throw into callers; log and return null/false on failure.
 */
import prisma from '@/lib/prisma'
import {
  onNotificationTrigger,
  notifyStaffUsers,
  getSchoolAdminUserIds,
} from '@/lib/notifications/triggers'
import { scheduleNotification } from '@/lib/notifications/dispatcher'
import { activityStartsAt } from '@/lib/hod/activitySchedule'
import { SMS_MASTERY_THRESHOLD, DEFAULT_TIMEZONE } from '@/lib/notifications/constants'
import { weeksFromSchemeJson } from '@/lib/teaching/performanceSummary'

async function safe(label, fn) {
  try {
    return await fn()
  } catch (error) {
    console.warn(`[notifications:${label}]`, error?.message || error)
    return null
  }
}

function daysBefore(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  d.setHours(7, 0, 0, 0)
  return d
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

/** Map JS getDay() → timetable dayOfWeek variants */
export function todayDayOfWeekKeys(date = new Date(), timezone = DEFAULT_TIMEZONE) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(
    date
  )
  const long = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(
    date
  )
  const map = {
    Mon: ['MON', 'Mon', 'Monday', '1'],
    Tue: ['TUE', 'Tue', 'Tuesday', '2'],
    Wed: ['WED', 'Wed', 'Wednesday', '3'],
    Thu: ['THU', 'Thu', 'Thursday', '4'],
    Fri: ['FRI', 'Fri', 'Friday', '5'],
    Sat: ['SAT', 'Sat', 'Saturday', '6'],
    Sun: ['SUN', 'Sun', 'Sunday', '0', '7'],
  }
  const short = weekday.slice(0, 3)
  return map[short] || [weekday, long, short.toUpperCase()]
}

export function combineLocalDateAndTime(date, timeStr, timezone = DEFAULT_TIMEZONE) {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const [y, m, d] = ymd.split('-').map(Number)
  const raw = String(timeStr || '07:00').trim()
  const match = raw.match(/^(\d{1,2}):(\d{2})/)
  const hour = match ? Number(match[1]) : 7
  const minute = match ? Number(match[2]) : 0
  // Approximate Africa/Lusaka (UTC+2) — schools use local wall clock
  const utc = Date.UTC(y, m - 1, d, hour - 2, minute, 0, 0)
  return new Date(utc)
}

/**
 * LOW_MASTERY_ALERT when class average &lt; 60% (SMS if &lt; 40%).
 */
export async function notifyLowMasteryFromTopicMastery(mastery) {
  return safe('low-mastery', async () => {
    if (!mastery?.needsReteaching && Number(mastery?.averageMasteryScore) >= 60) return null
    const score = Math.round(Number(mastery.averageMasteryScore) || 0)
    if (score >= 60) return null

    const classRow = await prisma.class.findFirst({
      where: { id: mastery.classId },
      select: { name: true, year_group: true },
    })
    const classLabel = classRow?.name || classRow?.year_group || 'class'
    const title = 'Low Mastery Alert'
    const message = `${mastery.topicName} — ${score}% in ${classLabel}. Reteach needed.`

    const teacherResult = await onNotificationTrigger({
      schoolId: mastery.schoolId,
      userId: mastery.teacherId,
      type: 'LOW_MASTERY_ALERT',
      title,
      message,
      actionUrl: '/dashboard/teacher/teaching-studio',
      metadata: {
        masteryScore: score,
        topicName: mastery.topicName,
        classId: mastery.classId,
        smsEligible: score < SMS_MASTERY_THRESHOLD,
      },
    })

    if (score < SMS_MASTERY_THRESHOLD) {
      const adminIds = await getSchoolAdminUserIds(mastery.schoolId)
      await notifyStaffUsers({
        schoolId: mastery.schoolId,
        userIds: adminIds.filter((id) => id !== mastery.teacherId),
        type: 'LOW_MASTERY_ALERT',
        title: 'Low mastery pattern',
        message: `Teacher alert: ${message}`,
        actionUrl: '/dashboard/admin/teacher-performance',
        metadata: { masteryScore: score, topicName: mastery.topicName, classId: mastery.classId },
      })
    }

    return teacherResult
  })
}

/**
 * SCHEME_PROGRESS after a week is marked taught.
 */
export async function notifySchemeProgressUpdate({
  schoolId,
  teacherId,
  subject,
  gradeOrForm,
  completedWeeks,
  totalWeeks,
  weekNumber,
  topicName,
}) {
  return safe('scheme-progress', async () => {
    if (!schoolId || !teacherId || !totalWeeks) return null
    const pct = Math.round((completedWeeks / totalWeeks) * 100)
    const topicBit = topicName
      ? ` (Week ${weekNumber}: ${topicName})`
      : weekNumber
        ? ` (Week ${weekNumber})`
        : ''
    return onNotificationTrigger({
      schoolId,
      userId: teacherId,
      type: 'SCHEME_PROGRESS',
      title: 'Scheme Progress',
      message:
        `${subject || 'Scheme'} ${gradeOrForm || ''}: ${pct}% (${completedWeeks}/${totalWeeks} weeks)${topicBit}`.trim(),
      actionUrl: '/dashboard/teacher/teaching-studio',
      metadata: { completedWeeks, totalWeeks, coveragePercent: pct, weekNumber },
    })
  })
}

/**
 * TEST_SCHEDULED + schedule TEST_DATE_REMINDER (7d and 1d before).
 */
export async function notifyAndScheduleTestReminders({
  schoolId,
  teacherId,
  schemeId,
  subject,
  midTermDate,
  endOfTermDate,
}) {
  return safe('test-schedule', async () => {
    if (!schoolId || !teacherId) return null
    const label = subject || 'Scheme test'
    const results = []

    const pendingReminders = await prisma.scheduledNotification.findMany({
      where: {
        schoolId,
        userId: teacherId,
        type: 'TEST_DATE_REMINDER',
        status: 'PENDING',
      },
      select: { id: true, data: true },
      take: 100,
    })
    const toCancel = pendingReminders
      .filter((row) => {
        const data = row.data && typeof row.data === 'object' ? row.data : {}
        return data.schemeId === schemeId
      })
      .map((row) => row.id)
    if (toCancel.length) {
      await prisma.scheduledNotification.updateMany({
        where: { id: { in: toCancel } },
        data: { status: 'CANCELLED' },
      })
    }

    const dates = [
      midTermDate ? { kind: 'mid-term', date: new Date(midTermDate) } : null,
      endOfTermDate ? { kind: 'end-of-term', date: new Date(endOfTermDate) } : null,
    ].filter(Boolean)

    if (dates.length) {
      results.push(
        await onNotificationTrigger({
          schoolId,
          userId: teacherId,
          type: 'TEST_SCHEDULED',
          title: 'Test Scheduled',
          message: `${label}: ${dates.map((d) => `${d.kind} on ${d.date.toLocaleDateString()}`).join('; ')}`,
          actionUrl: '/dashboard/teacher/teaching-studio',
          metadata: { schemeId, subject },
        })
      )
    }

    for (const item of dates) {
      if (Number.isNaN(item.date.getTime())) continue
      for (const days of [7, 1]) {
        const when = daysBefore(item.date, days)
        if (when.getTime() <= Date.now()) continue
        results.push(
          await scheduleNotification({
            schoolId,
            userId: teacherId,
            type: 'TEST_DATE_REMINDER',
            title: days === 1 ? 'Test tomorrow' : 'Test in 7 days',
            message:
              days === 1
                ? `${label} ${item.kind} tomorrow — prepare the class`
                : `${label} ${item.kind} in 7 days`,
            actionUrl: '/dashboard/teacher/teaching-studio',
            scheduledFor: when,
            data: {
              schemeId,
              testKind: item.kind,
              daysBefore: days,
              testDate: item.date.toISOString(),
            },
          })
        )
      }
    }

    return results
  })
}

/**
 * DEPARTMENT_MEETING_REMINDER for department teachers (30 min before + day-of morning).
 */
export async function scheduleDepartmentMeetingReminders({
  schoolId,
  departmentId,
  meetingId,
  title,
  meetingDate,
  meetingTime,
  createdByUserId,
}) {
  return safe('dept-meeting', async () => {
    if (!schoolId || !departmentId || !meetingDate) return null
    const startsAt = activityStartsAt(meetingDate, meetingTime)
    if (!startsAt || startsAt.getTime() <= Date.now()) return null

    const members = await prisma.teacherDepartment.findMany({
      where: { departmentId },
      select: { teacher: { select: { userId: true } } },
    })
    const userIds = new Set(members.map((m) => m.teacher?.userId).filter(Boolean))
    if (createdByUserId) userIds.add(createdByUserId)

    const reminderAt = addMinutes(startsAt, -30)
    const results = []
    for (const userId of userIds) {
      if (reminderAt.getTime() > Date.now()) {
        results.push(
          await scheduleNotification({
            schoolId,
            userId,
            type: 'DEPARTMENT_MEETING_REMINDER',
            title: 'Department meeting soon',
            message: `${title || 'Department meeting'} starts in 30 minutes`,
            actionUrl: '/dashboard/hod/meetings',
            scheduledFor: reminderAt,
            data: { meetingId, departmentId },
          })
        )
      }
    }
    return results
  })
}

/**
 * LESSON_ASSIGNED — notify students in the class (and teacher confirmation).
 */
export async function notifyLessonAssigned({
  schoolId,
  teacherUserId,
  classId,
  assignmentId,
  title,
  subject,
}) {
  return safe('lesson-assigned', async () => {
    if (!schoolId || !classId) return null
    const students = await prisma.student.findMany({
      where: { schoolId, classId },
      select: { userId: true },
      take: 200,
    })
    const label = title || subject || 'New lesson / assignment'
    const results = []

    for (const s of students) {
      if (!s.userId) continue
      results.push(
        await onNotificationTrigger({
          schoolId,
          userId: s.userId,
          type: 'LESSON_ASSIGNED',
          title: 'Lesson assigned',
          message: label,
          actionUrl: '/dashboard/student/assessments',
          metadata: { assignmentId, classId },
        })
      )
    }

    if (teacherUserId) {
      results.push(
        await onNotificationTrigger({
          schoolId,
          userId: teacherUserId,
          type: 'LESSON_ASSIGNED',
          title: 'Assignment published',
          message: `Published to class: ${label}`,
          actionUrl: '/dashboard/teacher/assessments',
          metadata: { assignmentId, classId },
        })
      )
    }

    return results
  })
}

/**
 * Cron: schedule CLASS_REMINDER for published periods starting in ~10 minutes.
 */
export async function scheduleUpcomingClassReminders({ windowMinutes = 12 } = {}) {
  return safe('class-reminders', async () => {
    const now = new Date()
    const dayKeys = todayDayOfWeekKeys(now)
    const entries = await prisma.timetableAllocationEntry.findMany({
      where: {
        status: 'published',
        dayOfWeek: { in: dayKeys },
      },
      take: 500,
      select: {
        id: true,
        schoolId: true,
        teacherId: true,
        classId: true,
        subjectId: true,
        startTime: true,
        dayOfWeek: true,
      },
    })

    let scheduled = 0
    for (const entry of entries) {
      const startsAt = combineLocalDateAndTime(now, entry.startTime)
      const remindAt = addMinutes(startsAt, -10)
      const msUntilRemind = remindAt.getTime() - now.getTime()
      // Due within the next cron window (default ~12 min), and class not already started
      if (msUntilRemind < -60_000 || msUntilRemind > windowMinutes * 60_000) continue
      if (startsAt.getTime() <= now.getTime()) continue

      const dedupeKey = `class-${entry.id}-${startsAt.toISOString().slice(0, 10)}`
      const existing = await prisma.scheduledNotification.findFirst({
        where: {
          schoolId: entry.schoolId,
          userId: entry.teacherId,
          type: 'CLASS_REMINDER',
          status: { in: ['PENDING', 'SENT'] },
          data: { path: ['dedupeKey'], equals: dedupeKey },
        },
        select: { id: true },
      })
      if (existing) continue

      const [classRow, subject] = await Promise.all([
        prisma.class.findFirst({
          where: { id: entry.classId },
          select: { name: true },
        }),
        prisma.subject.findFirst({
          where: { id: entry.subjectId },
          select: { name: true },
        }),
      ])

      await scheduleNotification({
        schoolId: entry.schoolId,
        userId: entry.teacherId,
        type: 'CLASS_REMINDER',
        title: 'Class in 10 minutes',
        message: `${subject?.name || 'Class'} with ${classRow?.name || 'your class'} at ${entry.startTime}`,
        actionUrl: '/dashboard/timetable/teacher',
        scheduledFor: remindAt.getTime() <= now.getTime() ? now : remindAt,
        data: {
          dedupeKey,
          entryId: entry.id,
          classId: entry.classId,
          subjectId: entry.subjectId,
        },
      })
      scheduled += 1
    }

    return { scanned: entries.length, scheduled }
  })
}

/**
 * Cron: MISSED_TEST_ALERT when test date is today/past and no Result for teacher that day.
 */
export async function scanMissedTests({ lookbackDays = 1 } = {}) {
  return safe('missed-tests', async () => {
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - lookbackDays)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)

    const schedules = await prisma.schemeTestSchedule.findMany({
      where: {
        OR: [
          { midTermDate: { gte: start, lte: end } },
          { endOfTermDate: { gte: start, lte: end } },
        ],
      },
      include: {
        scheme: { select: { subject: true, gradeOrForm: true, teacherId: true } },
      },
      take: 200,
    })

    let alerted = 0
    for (const row of schedules) {
      const checks = [
        row.midTermDate ? { kind: 'mid-term', date: row.midTermDate } : null,
        row.endOfTermDate ? { kind: 'end-of-term', date: row.endOfTermDate } : null,
      ].filter(Boolean)

      for (const check of checks) {
        const dayStart = new Date(check.date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(check.date)
        dayEnd.setHours(23, 59, 59, 999)
        if (dayEnd.getTime() > now.getTime() && dayStart.getTime() > now.getTime()) continue
        // Only alert once the test day has arrived (afternoon onwards or past)
        if (dayStart.toDateString() === now.toDateString() && now.getHours() < 12) continue

        const resultsCount = await prisma.result.count({
          where: {
            schoolId: row.schoolId,
            enteredByUserId: row.teacherId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        })
        if (resultsCount > 0) continue

        const dedupeKey = `missed-${row.id}-${check.kind}-${dayStart.toISOString().slice(0, 10)}`
        const already = await prisma.notification.findFirst({
          where: {
            schoolId: row.schoolId,
            userId: row.teacherId,
            type: 'MISSED_TEST_ALERT',
            createdAt: { gte: dayStart },
            metadata: { path: ['dedupeKey'], equals: dedupeKey },
          },
          select: { id: true },
        })
        if (already) continue

        const subject = row.scheme?.subject || 'Subject'
        const message = `${subject} ${check.kind} not conducted — follow up and record results`

        await onNotificationTrigger({
          schoolId: row.schoolId,
          userId: row.teacherId,
          type: 'MISSED_TEST_ALERT',
          title: 'Missed test alert',
          message,
          actionUrl: '/dashboard/teacher/results',
          metadata: { dedupeKey, schemeId: row.schemeId, testKind: check.kind },
        })

        const adminIds = await getSchoolAdminUserIds(row.schoolId)
        await notifyStaffUsers({
          schoolId: row.schoolId,
          userIds: adminIds.filter((id) => id !== row.teacherId),
          type: 'MISSED_TEST_ALERT',
          title: 'Missed test — admin follow-up',
          message: `${message} (teacher assigned to ${subject})`,
          actionUrl: '/admin/teacher-performance',
          metadata: { dedupeKey, schemeId: row.schemeId, teacherId: row.teacherId },
        })
        alerted += 1
      }
    }

    return { scanned: schedules.length, alerted }
  })
}

/**
 * Cron: weekly scheme progress digest for teachers with active schemes.
 * Runs Mondays (caller should gate by day if needed).
 */
export async function generateWeeklySchemeProgressDigests() {
  return safe('weekly-scheme', async () => {
    const schemes = await prisma.schemeOfWork.findMany({
      where: { year: new Date().getFullYear() },
      select: {
        id: true,
        schoolId: true,
        teacherId: true,
        subject: true,
        gradeOrForm: true,
        weeks: true,
        term: true,
      },
      take: 500,
    })

    let sent = 0
    for (const scheme of schemes) {
      const weekRows = weeksFromSchemeJson(scheme.weeks)
      const totalWeeks = weekRows.length || 12
      const completedWeeks = await prisma.schemeProgress.count({
        where: { schemeId: scheme.id, completed: true },
      })
      if (completedWeeks === 0) continue

      await notifySchemeProgressUpdate({
        schoolId: scheme.schoolId,
        teacherId: scheme.teacherId,
        subject: scheme.subject,
        gradeOrForm: scheme.gradeOrForm,
        completedWeeks,
        totalWeeks,
      })
      sent += 1
    }
    return { schemes: schemes.length, sent }
  })
}
