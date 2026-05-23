import prisma from '@/lib/prisma'
import {
  buildAttendanceSmsMessage,
  buildChronicAbsenceSmsMessage,
  normalizePhoneNumbers,
  pushSmsLog,
  sendAfricasTalkingSms,
} from '@/lib/sms'

export const LATE_AFTER_MINUTES_DEFAULT = 10
export const CHRONIC_ABSENCE_THRESHOLD = 5

function mapMarkStatusToSms(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'PRESENT') return 'present'
  if (s === 'LATE') return 'late'
  if (s === 'ABSENT') return 'absent'
  return 'present'
}

export async function getEnrolledRoster(schoolId, classId, subjectId) {
  const enrollments = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, classId, subjectId },
    include: {
      pupil: {
        select: {
          id: true,
          name: true,
          class: true,
          exam_number: true,
          faceEmbedding: true,
          twinGroupId: true,
          requiresSecondaryAuth: true,
          parent_father_contact: true,
          parent_mother_contact: true,
          guardian_contact: true,
        },
      },
    },
    orderBy: { pupil: { name: 'asc' } },
  })
  return enrollments.map((e) => e.pupil)
}

export async function openAttendanceSession({
  schoolId,
  teacherUserId,
  classId,
  subjectId,
  periodLabel,
  term,
  academicYear,
  shift = 'SINGLE',
  verificationMethod = 'MANUAL',
  lateAfterMinutes = LATE_AFTER_MINUTES_DEFAULT,
}) {
  const existing = await prisma.attendanceSession.findFirst({
    where: {
      schoolId,
      teacherId: teacherUserId,
      classId,
      subjectId,
      status: 'OPEN',
    },
    select: { id: true },
  })
  if (existing) {
    return prisma.attendanceSession.findUnique({
      where: { id: existing.id },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        marks: true,
      },
    })
  }

  return prisma.attendanceSession.create({
    data: {
      schoolId,
      teacherId: teacherUserId,
      classId,
      subjectId,
      periodLabel: periodLabel || null,
      term: term != null ? Number(term) : null,
      academicYear: academicYear || null,
      shift,
      verificationMethod,
      lateAfterMinutes,
      status: 'OPEN',
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      marks: true,
    },
  })
}

function resolveMarkStatus(session, faceMatchScore) {
  const started = new Date(session.startedAt).getTime()
  const elapsedMin = (Date.now() - started) / 60000
  const lateAfter = Number(session.lateAfterMinutes) || LATE_AFTER_MINUTES_DEFAULT
  if (elapsedMin > lateAfter) return 'LATE'
  return 'PRESENT'
}

async function assertTwinAllowed(sessionId, student, secondaryVerified) {
  if (!student.twinGroupId) return true
  const twinPresent = await prisma.attendanceMark.findFirst({
    where: {
      sessionId,
      status: { in: ['PRESENT', 'LATE'] },
      student: { twinGroupId: student.twinGroupId },
      studentId: { not: student.id },
    },
    select: { id: true },
  })
  if (twinPresent && student.requiresSecondaryAuth && !secondaryVerified) {
    const err = new Error('TWIN_SECONDARY_AUTH_REQUIRED')
    err.code = 'TWIN_SECONDARY_AUTH_REQUIRED'
    throw err
  }
  return true
}

export async function recordAttendanceMark({
  sessionId,
  schoolId,
  studentId,
  method = 'MANUAL',
  faceMatchScore,
  secondaryVerified = false,
  statusOverride,
}) {
  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, schoolId, status: 'OPEN' },
    include: {
      subject: { select: { name: true } },
      school: { select: { name: true, plan: true } },
    },
  })
  if (!session) {
    const err = new Error('Session not found or already closed')
    err.status = 404
    throw err
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      name: true,
      twinGroupId: true,
      requiresSecondaryAuth: true,
      parent_father_contact: true,
      parent_mother_contact: true,
      guardian_contact: true,
    },
  })
  if (!student) {
    const err = new Error('Student not found')
    err.status = 404
    throw err
  }

  await assertTwinAllowed(sessionId, student, secondaryVerified)

  const status = statusOverride || resolveMarkStatus(session, faceMatchScore)

  const normalizedStatus = String(status).toUpperCase()
  const valid = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED']
  if (!valid.includes(normalizedStatus)) {
    const err = new Error('Invalid status')
    err.status = 400
    throw err
  }

  const mark = await prisma.attendanceMark.upsert({
    where: {
      sessionId_studentId: { sessionId, studentId },
    },
    create: {
      sessionId,
      studentId,
      schoolId,
      status: normalizedStatus,
      method: String(method).toUpperCase(),
      faceMatchScore: faceMatchScore != null ? Number(faceMatchScore) : null,
    },
    update: {
      status: normalizedStatus,
      method: String(method).toUpperCase(),
      faceMatchScore: faceMatchScore != null ? Number(faceMatchScore) : null,
      markedAt: new Date(),
    },
  })

  if (['PRESENT', 'LATE'].includes(normalizedStatus)) {
    await sendMarkSms(session, student, normalizedStatus).catch(() => {})
  }

  return mark
}

async function sendMarkSms(session, student, markStatus) {
  const plan = String(session.school?.plan || '')
    .trim()
    .toLowerCase()
  if (plan !== 'standard' && plan !== 'premium') return

  const recipients = normalizePhoneNumbers([
    student.parent_father_contact,
    student.parent_mother_contact,
    student.guardian_contact,
  ])
  if (recipients.length === 0) return

  const subjectName = session.subject?.name || 'class'
  const timeLabel = new Date().toLocaleTimeString('en-ZM', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lusaka',
  })
  const message = `ZSMS: ${student.name} is in class. Subject: ${subjectName} at ${timeLabel}.`

  await sendAfricasTalkingSms({ to: recipients, message })
  pushSmsLog({
    direction: 'out',
    schoolId: session.schoolId,
    to: recipients,
    message,
    event: 'lesson_attendance_present',
    studentId: student.id,
    status: mapMarkStatusToSms(markStatus),
  })
}

export async function closeAttendanceSession({ sessionId, schoolId, sendAbsentSms = true }) {
  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, schoolId },
    include: {
      marks: true,
      subject: { select: { name: true } },
      class: { select: { name: true } },
      school: { select: { name: true, plan: true } },
    },
  })
  if (!session) {
    const err = new Error('Session not found')
    err.status = 404
    throw err
  }
  if (session.status === 'CLOSED') {
    return session
  }

  const roster = await getEnrolledRoster(schoolId, session.classId, session.subjectId)
  const markedIds = new Set(session.marks.map((m) => m.studentId))
  const absentStudents = roster.filter((s) => !markedIds.has(s.id))

  await prisma.$transaction([
    ...absentStudents.map((s) =>
      prisma.attendanceMark.create({
        data: {
          sessionId,
          studentId: s.id,
          schoolId,
          status: 'ABSENT',
          method: 'MANUAL',
        },
      })
    ),
    prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED', endedAt: new Date() },
    }),
  ])

  if (sendAbsentSms && absentStudents.length > 0) {
    await sendAbsentSmsBatch(session, absentStudents).catch(() => {})
  }

  return prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      marks: { include: { student: { select: { id: true, name: true } } } },
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
  })
}

async function sendAbsentSmsBatch(session, students) {
  const plan = String(session.school?.plan || '')
    .trim()
    .toLowerCase()
  if (plan !== 'standard' && plan !== 'premium') return

  const subjectName = session.subject?.name || 'class'
  for (const student of students) {
    const recipients = normalizePhoneNumbers([
      student.parent_father_contact,
      student.parent_mother_contact,
      student.guardian_contact,
    ])
    if (recipients.length === 0) continue
    const message = buildAttendanceSmsMessage({
      schoolName: session.school?.name || 'School',
      studentName: student.name,
      status: 'absent',
      dateIso: new Date().toISOString(),
    }).replace('on ' + new Date().toISOString().slice(0, 10), `from ${subjectName}`)
    await sendAfricasTalkingSms({ to: recipients, message })
  }
}

export async function getHeadteacherLiveAttendance(schoolId) {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      schoolId,
      startedAt: { gte: start, lt: end },
    },
    include: {
      teacher: { select: { name: true } },
      class: { select: { name: true } },
      subject: { select: { name: true } },
      marks: { select: { status: true } },
    },
    orderBy: { startedAt: 'desc' },
  })

  const mapped = sessions.map((s) => {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 }
    for (const m of s.marks) {
      const k = String(m.status).toUpperCase()
      if (counts[k] != null) counts[k] += 1
    }
    return {
      sessionId: s.id,
      className: s.class?.name,
      subjectName: s.subject?.name,
      teacherName: s.teacher?.name,
      status: s.status,
      periodLabel: s.periodLabel,
      present: counts.PRESENT,
      late: counts.LATE,
      absent: counts.ABSENT,
      excused: counts.EXCUSED,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    }
  })

  const totalMarks = mapped.reduce((acc, s) => acc + s.present + s.late + s.absent + s.excused, 0)
  const presentLike = mapped.reduce((acc, s) => acc + s.present + s.late, 0)
  const schoolWideRate = totalMarks > 0 ? presentLike / totalMarks : 0

  return {
    date: start.toISOString().slice(0, 10),
    sessions: mapped,
    schoolWideRate,
  }
}

export async function getChronicAbsentees({
  schoolId,
  subjectId,
  teacherUserId,
  term,
  academicYear,
  threshold = CHRONIC_ABSENCE_THRESHOLD,
}) {
  const sessionWhere = {
    ...(subjectId ? { subjectId } : {}),
    ...(teacherUserId ? { teacherId: teacherUserId } : {}),
    ...(term != null ? { term: Number(term) } : {}),
    ...(academicYear ? { academicYear } : {}),
  }

  const marks = await prisma.attendanceMark.findMany({
    where: {
      schoolId,
      status: 'ABSENT',
      session: sessionWhere,
    },
    select: {
      studentId: true,
      session: { select: { subjectId: true, subject: { select: { name: true } } } },
    },
  })

  const byStudentSubject = new Map()
  for (const m of marks) {
    const sid = m.studentId
    const subId = m.session?.subjectId || 'unknown'
    const key = `${sid}:${subId}`
    const row = byStudentSubject.get(key) || {
      studentId: sid,
      subjectId: subId,
      subjectName: m.session?.subject?.name || null,
      absenceCount: 0,
    }
    row.absenceCount += 1
    byStudentSubject.set(key, row)
  }

  const chronicRows = [...byStudentSubject.values()].filter((r) => r.absenceCount >= threshold)
  if (chronicRows.length === 0) return []

  const studentIds = [...new Set(chronicRows.map((r) => r.studentId))]
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      name: true,
      class: true,
      parent_father_contact: true,
      parent_mother_contact: true,
      guardian_contact: true,
    },
  })
  const studentById = new Map(students.map((s) => [s.id, s]))

  return chronicRows
    .map((r) => {
      const s = studentById.get(r.studentId)
      return {
        studentId: r.studentId,
        name: s?.name || 'Unknown',
        class: s?.class || null,
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        absenceCount: r.absenceCount,
        parentContacts: {
          father: s?.parent_father_contact,
          mother: s?.parent_mother_contact,
          guardian: s?.guardian_contact,
        },
      }
    })
    .sort((a, b) => b.absenceCount - a.absenceCount)
}

export async function sendChronicAbsenteeAlerts({
  schoolId,
  subjectId,
  term,
  academicYear,
  threshold = CHRONIC_ABSENCE_THRESHOLD,
  notifyParents = true,
  notifyTeachers = true,
}) {
  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: { name: true, plan: true },
  })
  const plan = String(school?.plan || '')
    .trim()
    .toLowerCase()
  const smsAllowed = plan === 'standard' || plan === 'premium'

  const chronic = await getChronicAbsentees({
    schoolId,
    subjectId,
    term,
    academicYear,
    threshold,
  })
  if (chronic.length === 0) {
    return { chronicCount: 0, parentsNotified: 0, teachersNotified: 0 }
  }

  const termLabel = term != null ? `Term ${term}` : academicYear ? String(academicYear) : ''
  let parentsNotified = 0
  let teachersNotified = 0

  if (notifyParents && smsAllowed) {
    for (const row of chronic) {
      const recipients = normalizePhoneNumbers([
        row.parentContacts?.father,
        row.parentContacts?.mother,
        row.parentContacts?.guardian,
      ])
      if (recipients.length === 0) continue
      const message = buildChronicAbsenceSmsMessage({
        schoolName: school?.name,
        studentName: row.name,
        subjectName: row.subjectName,
        absenceCount: row.absenceCount,
        termLabel,
      })
      await sendAfricasTalkingSms({ to: recipients, message }).catch(() => {})
      pushSmsLog({
        direction: 'out',
        schoolId,
        to: recipients,
        message,
        event: 'chronic_absence',
        studentId: row.studentId,
        status: 'absent',
      })
      parentsNotified += 1
    }
  }

  if (notifyTeachers && smsAllowed) {
    const subjectIds = [
      ...new Set(chronic.map((c) => c.subjectId).filter((id) => id !== 'unknown')),
    ]
    for (const subId of subjectIds) {
      const assignment = await prisma.teachingAssignment.findFirst({
        where: { schoolId, subjectId: subId },
        include: {
          teacher: {
            include: { user: { select: { contact_number: true, name: true } } },
          },
        },
      })
      const phone = assignment?.teacher?.user?.contact_number
      const recipients = normalizePhoneNumbers([phone])
      if (recipients.length === 0) continue
      const subjectChronic = chronic.filter((c) => c.subjectId === subId)
      const names = subjectChronic
        .map((c) => c.name)
        .slice(0, 5)
        .join(', ')
      const subName = subjectChronic[0]?.subjectName || 'subject'
      const message = `ZSMS: ${subjectChronic.length} pupil(s) have ${threshold}+ absences in ${subName}: ${names}${subjectChronic.length > 5 ? '…' : ''}.`
      await sendAfricasTalkingSms({ to: recipients, message }).catch(() => {})
      teachersNotified += 1
    }
  }

  return {
    chronicCount: chronic.length,
    parentsNotified,
    teachersNotified,
    students: chronic,
  }
}
