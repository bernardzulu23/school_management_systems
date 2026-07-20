import prisma from '@/lib/prisma'
import { normalizePhoneNumbers, normalizeZmPhoneNumber } from '@/lib/sms/normalizePhone'
import { pushSmsLog, sendAfricasTalkingSms, getSchoolSmsFrom } from '@/lib/sms'
import { getOrCreateSmsSettings } from '@/lib/sms/balance'

const BATCH_SIZE = 5
const BATCH_DELAY_MS = 500

const DEFAULT_SMS_PREFS = {
  parentSmsAbsent: true,
  parentSmsLate: true,
  parentSmsPresent: false,
  parentSmsExcused: false,
}

/** @deprecated Use normalizeZmPhoneNumber from @/lib/sms */
export function formatZambianPhone(phone) {
  return normalizeZmPhoneNumber(phone)
}

export function extractParentContacts(student) {
  const raw = [
    student?.guardian_contact,
    student?.parent_father_contact,
    student?.parent_mother_contact,
  ]
  return raw.map((v) => String(v || '').trim()).filter(Boolean)
}

export function isParentSmsEnabledForStatus(prefs, status) {
  const s = String(status || '').toLowerCase()
  const map = {
    absent: prefs?.parentSmsAbsent ?? DEFAULT_SMS_PREFS.parentSmsAbsent,
    late: prefs?.parentSmsLate ?? DEFAULT_SMS_PREFS.parentSmsLate,
    present: prefs?.parentSmsPresent ?? DEFAULT_SMS_PREFS.parentSmsPresent,
    excused: prefs?.parentSmsExcused ?? DEFAULT_SMS_PREFS.parentSmsExcused,
  }
  return map[s] === true
}

export function buildAttendanceSMS({
  studentName,
  className,
  status,
  date,
  schoolName,
  timeStr,
  subjectName,
}) {
  const dayStr = new Date(date || Date.now()).toLocaleDateString('en-ZM', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Lusaka',
  })
  const timeLabel = timeStr ? ` at ${timeStr}` : ''
  const safeStudent = String(studentName || 'Student').trim() || 'Student'
  const safeClass = String(className || 'class').trim() || 'class'
  const safeSchool = String(schoolName || 'School').trim() || 'School'
  const subjectPart = subjectName ? ` (${String(subjectName).trim()})` : ''

  switch (String(status || '').toLowerCase()) {
    case 'absent':
      return (
        `ATTENDANCE ALERT: Dear Parent/Guardian, ` +
        `${safeStudent} (${safeClass}) was marked ABSENT from school${subjectPart} on ${dayStr}${timeLabel}. ` +
        `If this is unexpected, please contact ${safeSchool} immediately. - ZSMS`
      )
    case 'late':
      return (
        `ATTENDANCE NOTICE: Dear Parent/Guardian, ` +
        `${safeStudent} (${safeClass}) arrived LATE to school${subjectPart} on ${dayStr}${timeLabel}. ` +
        `Please ensure punctual arrival. - ${safeSchool}`
      )
    case 'present':
      return (
        `ATTENDANCE UPDATE: Dear Parent/Guardian, ` +
        `${safeStudent} (${safeClass}) was marked PRESENT on ${dayStr}${timeLabel}. - ${safeSchool}`
      )
    case 'excused':
      return (
        `ATTENDANCE UPDATE: ${safeStudent} (${safeClass}) has been recorded ` +
        `as excused absent on ${dayStr}. - ${safeSchool}`
      )
    default:
      return null
  }
}

async function loadAttendanceSmsContext(schoolId) {
  const [school, smsSettings] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, plan: true },
    }),
    getOrCreateSmsSettings(schoolId),
  ])

  const plan = String(school?.plan || '')
    .trim()
    .toLowerCase()
  const smsAllowed = plan === 'standard' || plan === 'premium'

  return {
    schoolName: school?.name || 'School',
    smsAllowed,
    prefs: {
      parentSmsAbsent: smsSettings.parentSmsAbsent ?? DEFAULT_SMS_PREFS.parentSmsAbsent,
      parentSmsLate: smsSettings.parentSmsLate ?? DEFAULT_SMS_PREFS.parentSmsLate,
      parentSmsPresent: smsSettings.parentSmsPresent ?? DEFAULT_SMS_PREFS.parentSmsPresent,
      parentSmsExcused: smsSettings.parentSmsExcused ?? DEFAULT_SMS_PREFS.parentSmsExcused,
    },
  }
}

function mapMarkStatus(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'PRESENT') return 'present'
  if (s === 'LATE') return 'late'
  if (s === 'ABSENT') return 'absent'
  if (s === 'EXCUSED') return 'excused'
  return String(status || '').toLowerCase()
}

/**
 * Send SMS to parent/guardian when attendance is marked.
 */
export async function notifyParentAttendance({
  studentId,
  schoolId,
  status,
  date,
  sessionId,
  subjectName,
  className: classNameOverride,
  timeStr: timeStrOverride,
}) {
  try {
    const normalizedStatus = mapMarkStatus(status)
    if (!normalizedStatus) {
      return { sent: false, reason: 'Invalid status' }
    }

    const ctx = await loadAttendanceSmsContext(schoolId)
    if (!ctx.smsAllowed) {
      return { sent: false, reason: 'SMS not included in school plan' }
    }
    if (!isParentSmsEnabledForStatus(ctx.prefs, normalizedStatus)) {
      return { sent: false, reason: `SMS disabled for status: ${normalizedStatus}` }
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        name: true,
        class: true,
        parent_father_contact: true,
        parent_mother_contact: true,
        guardian_contact: true,
        classRef: { select: { name: true, year_group: true } },
      },
    })
    if (!student) return { sent: false, reason: 'Student not found' }

    const recipients = normalizePhoneNumbers(extractParentContacts(student))
    if (recipients.length === 0) {
      return { sent: false, reason: 'No parent phone number on record' }
    }

    let timeStr = timeStrOverride || null
    let subject = subjectName || null
    if (sessionId) {
      const session = await prisma.attendanceSession.findFirst({
        where: { id: sessionId, schoolId },
        select: {
          startedAt: true,
          subject: { select: { name: true } },
        },
      })
      if (session?.startedAt && !timeStr) {
        timeStr = new Date(session.startedAt).toLocaleTimeString('en-ZM', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Lusaka',
        })
      }
      if (!subject && session?.subject?.name) subject = session.subject.name
    }

    const className =
      classNameOverride ||
      student.class ||
      student.classRef?.name ||
      student.classRef?.year_group ||
      'class'

    const message = buildAttendanceSMS({
      studentName: student.name,
      className,
      status: normalizedStatus,
      date: date || new Date(),
      schoolName: ctx.schoolName,
      timeStr,
      subjectName: subject,
    })
    if (!message) {
      return { sent: false, reason: 'No message template for this status' }
    }

    await sendAfricasTalkingSms({
      to: recipients,
      message,
      from: getSchoolSmsFrom(),
      schoolId,
    })
    pushSmsLog({
      direction: 'out',
      schoolId,
      to: recipients,
      message,
      event: 'attendance_status',
      studentId: student.id,
      status: normalizedStatus,
      date: date instanceof Date ? date.toISOString() : String(date || new Date().toISOString()),
    })

    return {
      sent: true,
      phone: recipients[0],
      status: normalizedStatus,
      studentName: student.name,
    }
  } catch (error) {
    console.error(`[ParentSMS] Failed to notify for student ${studentId}:`, error?.message)
    return { sent: false, reason: error?.message }
  }
}

/**
 * Batch parent notifications with rate-limit friendly delays.
 */
export async function notifyParentsBatch(marks, schoolId, sessionId, date, opts = {}) {
  const list = Array.isArray(marks) ? marks : []
  const summary = { sent: 0, failed: 0, skipped: list.length }

  const ctx = await loadAttendanceSmsContext(schoolId)
  if (!ctx.smsAllowed) {
    summary.skipped = list.length
    return summary
  }

  const alertMarks = list.filter((m) => {
    const status = mapMarkStatus(m?.status)
    return status && isParentSmsEnabledForStatus(ctx.prefs, status)
  })

  summary.skipped = list.length - alertMarks.length
  if (alertMarks.length === 0) return summary

  for (let i = 0; i < alertMarks.length; i += BATCH_SIZE) {
    const batch = alertMarks.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((mark) =>
        notifyParentAttendance({
          studentId: mark.studentId,
          schoolId,
          status: mark.status,
          date: mark.date || date,
          sessionId: mark.sessionId || sessionId,
          subjectName: opts.subjectName,
          className: mark.className,
        })
      )
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.sent) summary.sent += 1
      else summary.failed += 1
    }
    if (i + BATCH_SIZE < alertMarks.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  return summary
}

/** Fire-and-forget wrapper — never blocks the attendance API response. */
export function scheduleParentAttendanceSmsBatch(params) {
  notifyParentsBatch(
    params.marks,
    params.schoolId,
    params.sessionId,
    params.date,
    params.opts
  ).catch((err) => console.error('[BatchAttendanceSMS] Error:', err?.message || err))
}

export function scheduleParentAttendanceSms(params) {
  notifyParentAttendance(params).catch((err) =>
    console.error('[AttendanceSMS] Fire-and-forget error:', err?.message || err)
  )
}

/** Back-compat for existing imports from attendanceSms.js */
export async function sendAttendanceStatusSmsBatch({ schoolId, writes }) {
  const marks = (Array.isArray(writes) ? writes : []).map((r) => ({
    studentId: r.studentId,
    status: r.status,
    date: r.date,
  }))
  return notifyParentsBatch(marks, schoolId, null, new Date())
}
