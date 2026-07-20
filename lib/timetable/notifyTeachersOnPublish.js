/**
 * SMS notify teachers whose published schedule actually changed (diff-based).
 * Uses school Africa's Talking / outbound SMS + credit ledger — not AWS SNS.
 */

import { prisma } from '@/lib/prisma'
import {
  sendAfricasTalkingSms,
  getSchoolSmsFrom,
  normalizePhoneNumbers,
  buildTimetableChangedSmsMessage,
} from '@/lib/sms'
import { createSmsLog } from '@/lib/sms/persistLog'
import { reserveSmsCredits, refundSmsCredit } from '@/lib/sms/balance'
import {
  diffAffectedTeacherIds,
  snapshotPublishedScheduleSlots,
} from '@/lib/timetable/scheduleDiff'

export { buildTimetableChangedSmsMessage }

/**
 * After a successful promote: diff previous published vs new published, SMS only affected teachers.
 *
 * @param {{
 *   schoolId: string
 *   term: string
 *   academicYear: string
 *   beforeEntries: Array<object>
 *   afterEntries?: Array<object> | null
 * }} opts
 */
export async function notifyTeachersOnTimetablePublish({
  schoolId,
  term,
  academicYear,
  beforeEntries,
  afterEntries = null,
}) {
  const after =
    afterEntries || (await snapshotPublishedScheduleSlots(prisma, { schoolId, term, academicYear }))

  const diff = diffAffectedTeacherIds(beforeEntries || [], after)
  const teacherIds = diff.affectedTeacherIds

  if (!teacherIds.length) {
    return {
      ok: true,
      skipped: true,
      reason: 'no_schedule_changes',
      affectedTeacherIds: [],
      smsQueued: 0,
      ...diff,
    }
  }

  const [school, users] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    }),
    prisma.user.findMany({
      where: { id: { in: teacherIds }, schoolId },
      select: { id: true, name: true, contact_number: true },
    }),
  ])

  const message = buildTimetableChangedSmsMessage({
    schoolName: school?.name,
    term,
    academicYear,
  })

  /** @type {Map<string, string>} phone → teacherId (first wins) */
  const phoneToTeacher = new Map()
  const noPhone = []

  for (const u of users) {
    const normalized = normalizePhoneNumbers([u.contact_number])
    if (!normalized.length) {
      noPhone.push(u.id)
      continue
    }
    const phone = normalized[0]
    if (!phoneToTeacher.has(phone)) phoneToTeacher.set(phone, u.id)
  }

  const phones = [...phoneToTeacher.keys()]
  if (!phones.length) {
    return {
      ok: true,
      skipped: true,
      reason: 'no_valid_phones',
      affectedTeacherIds: teacherIds,
      smsQueued: 0,
      noPhone,
      ...diff,
    }
  }

  const reserve = await reserveSmsCredits(schoolId, phones.length)
  if (!reserve.ok) {
    return {
      ok: false,
      reason: reserve.reason || 'insufficient_sms_credits',
      affectedTeacherIds: teacherIds,
      smsQueued: 0,
      noPhone,
      balance: reserve.balance,
      ...diff,
    }
  }

  const result = await sendAfricasTalkingSms({
    to: phones,
    message,
    from: getSchoolSmsFrom(),
    schoolId,
  })

  if (!result.ok) {
    await refundSmsCredit(schoolId, phones.length).catch(() => {})
    return {
      ok: false,
      reason: result.reason || 'sms_delivery_failed',
      affectedTeacherIds: teacherIds,
      smsQueued: 0,
      noPhone,
      ...diff,
    }
  }

  if (!result.queuedForGateway) {
    for (const phone of result.recipients || phones) {
      await createSmsLog({
        schoolId,
        direction: 'out',
        recipient: phone,
        body: message,
        status: 'SENT',
        provider: result.provider || 'africastalking',
      }).catch(() => {})
    }
  }

  return {
    ok: true,
    skipped: false,
    affectedTeacherIds: teacherIds,
    smsQueued: (result.recipients || phones).length,
    noPhone,
    provider: result.provider,
    ...diff,
  }
}
