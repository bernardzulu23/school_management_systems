import prisma from '@/lib/prisma'
import {
  buildAttendanceSmsMessage,
  normalizePhoneNumbers,
  pushSmsLog,
  sendAfricasTalkingSms,
} from '@/lib/sms'

export async function sendAttendanceStatusSmsBatch({ schoolId, writes }) {
  const notifyWrites = (Array.isArray(writes) ? writes : []).filter((r) =>
    ['present', 'absent', 'late'].includes(String(r?.status || '').toLowerCase())
  )
  const smsSummary = { attempted: 0, sent: 0, skipped: 0, failed: 0 }
  if (!notifyWrites.length) return smsSummary

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, plan: true },
  })
  const plan = String(school?.plan || '')
    .trim()
    .toLowerCase()
  const smsAllowed = plan === 'standard' || plan === 'premium'
  if (!smsAllowed) {
    smsSummary.skipped += notifyWrites.length
    return smsSummary
  }

  const studentIds = Array.from(
    new Set(notifyWrites.map((r) => String(r.studentId || '')).filter(Boolean))
  )
  const students = await prisma.student.findMany({
    where: { schoolId, id: { in: studentIds } },
    select: {
      id: true,
      name: true,
      parent_father_contact: true,
      parent_mother_contact: true,
      guardian_contact: true,
    },
  })
  const schoolName = school?.name || 'School'
  const studentById = new Map(students.map((s) => [s.id, s]))

  const results = await Promise.allSettled(
    notifyWrites.map(async (r) => {
      smsSummary.attempted += 1

      const student = studentById.get(String(r.studentId))
      if (!student) {
        smsSummary.skipped += 1
        return
      }

      const recipients = normalizePhoneNumbers([
        student.parent_father_contact,
        student.parent_mother_contact,
        student.guardian_contact,
      ])
      if (recipients.length === 0) {
        smsSummary.skipped += 1
        return
      }

      const message = buildAttendanceSmsMessage({
        schoolName,
        studentName: student.name,
        status: String(r.status || '').toLowerCase(),
        dateIso: r.date instanceof Date ? r.date.toISOString() : String(r.date || ''),
      })
      const sent = await sendAfricasTalkingSms({ to: recipients, message })

      pushSmsLog({
        direction: 'out',
        schoolId,
        to: sent.recipients,
        message,
        event: 'attendance_status',
        studentId: student.id,
        status: String(r.status || '').toLowerCase(),
        date: r.date instanceof Date ? r.date.toISOString() : String(r.date || ''),
      })

      smsSummary.sent += 1
    })
  )

  for (const r of results) if (r.status === 'rejected') smsSummary.failed += 1
  return smsSummary
}
