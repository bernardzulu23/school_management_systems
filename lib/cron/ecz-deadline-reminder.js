/**
 * ECZ SBA deadline SMS reminders (15 January) for draft submissions.
 */
import prisma from '@/lib/prisma'
import { sendSchoolSms, normalizePhoneNumbers } from '@/lib/sms'

const REMINDER_MESSAGE =
  'ZSMS Reminder: ECZ SBA scores are due by 31 January. Submit via your teacher dashboard.'

/**
 * @returns {Promise<{ schools: number, smsSent: number, skipped: number }>}
 */
export async function runEczDeadlineReminder() {
  const year = new Date().getFullYear()
  const drafts = await prisma.eczSubmission.findMany({
    where: {
      academicYear: year,
      status: { in: ['DRAFT', 'IN_PROGRESS'] },
    },
    include: {
      subject: { select: { name: true } },
      school: { select: { id: true, name: true } },
    },
  })

  if (drafts.length === 0) {
    return { schools: 0, smsSent: 0, skipped: 0 }
  }

  const schoolIds = [...new Set(drafts.map((d) => d.schoolId))]
  let smsSent = 0
  let skipped = 0

  for (const schoolId of schoolIds) {
    const schoolDrafts = drafts.filter((d) => d.schoolId === schoolId)
    const subjectNames = [
      ...new Set(schoolDrafts.map((d) => d.subject?.name).filter(Boolean)),
    ].slice(0, 3)

    const staff = await prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['headteacher', 'HOD', 'hod', 'teacher', 'TEACHER'] },
        phone: { not: null },
      },
      select: { phone: true, name: true },
      take: 20,
    })

    const phones = normalizePhoneNumbers(staff.map((u) => u.phone).filter(Boolean))
    if (phones.length === 0) {
      skipped += staff.length
      continue
    }

    const detail =
      subjectNames.length > 0
        ? ` Pending: ${subjectNames.join(', ')}.`
        : ` ${schoolDrafts.length} draft submission(s).`
    const message = `${REMINDER_MESSAGE}${detail}`

    try {
      await sendSchoolSms({ to: phones, message, schoolId })
      smsSent += phones.length
    } catch {
      skipped += phones.length
    }
  }

  return { schools: schoolIds.length, smsSent, skipped }
}
