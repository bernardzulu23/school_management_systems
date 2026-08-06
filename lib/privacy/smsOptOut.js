/**
 * Per-parent / per-phone SMS opt-out (Phase 5 M2).
 * School-wide SchoolSmsSettings still apply; personal opt-out is additional.
 */
import prisma from '@/lib/prisma'
import { normalizeZmPhoneNumber, normalizePhoneNumbers } from '@/lib/sms/normalizePhone'

function phoneTail(n) {
  const d = String(n || '').replace(/\D/g, '')
  return d.length >= 9 ? d.slice(-9) : d
}

/**
 * @param {string} schoolId
 * @param {string[]} phones
 * @param {'attendance'|'fees'|'all'} channel
 * @returns {Promise<string[]>} phones still allowed to receive SMS
 */
export async function filterPhonesNotOptedOut(schoolId, phones, channel = 'all') {
  const sid = String(schoolId || '').trim()
  const list = normalizePhoneNumbers(phones || [])
  if (!sid || !list.length) return []

  const normalized = list.map((p) => normalizeZmPhoneNumber(p) || p).filter(Boolean)
  if (!normalized.length) return []

  const tails = [...new Set(normalized.map(phoneTail).filter(Boolean))]

  const [contactRows, profiles] = await Promise.all([
    prisma.smsContactOptOut.findMany({
      where: {
        schoolId: sid,
        OR: [
          { phoneNormalized: { in: normalized } },
          ...tails.map((t) => ({ phoneNormalized: { endsWith: t } })),
        ],
      },
      select: {
        phoneNormalized: true,
        optOutAll: true,
        optOutAttendance: true,
        optOutFees: true,
      },
    }),
    prisma.parentProfile.findMany({
      where: {
        schoolId: sid,
        OR: [{ smsOptOutAll: true }, { smsOptOutAttendance: true }, { smsOptOutFees: true }],
        phone: { not: null },
      },
      select: {
        phone: true,
        smsOptOutAll: true,
        smsOptOutAttendance: true,
        smsOptOutFees: true,
      },
      take: 500,
    }),
  ])

  /** @param {{ optOutAll?: boolean, optOutAttendance?: boolean, optOutFees?: boolean, smsOptOutAll?: boolean, smsOptOutAttendance?: boolean, smsOptOutFees?: boolean }} row */
  function isBlocked(row) {
    const all = row.optOutAll ?? row.smsOptOutAll
    if (all) return true
    if (channel === 'attendance' && (row.optOutAttendance ?? row.smsOptOutAttendance)) return true
    if (channel === 'fees' && (row.optOutFees ?? row.smsOptOutFees)) return true
    return false
  }

  const blockedTails = new Set()
  for (const row of contactRows) {
    if (isBlocked(row)) blockedTails.add(phoneTail(row.phoneNormalized))
  }
  for (const profile of profiles) {
    if (!isBlocked(profile)) continue
    const t = phoneTail(normalizeZmPhoneNumber(profile.phone) || profile.phone)
    if (t) blockedTails.add(t)
  }

  return list.filter((p) => {
    const n = normalizeZmPhoneNumber(p) || p
    return !blockedTails.has(phoneTail(n))
  })
}

/**
 * Upsert phone-level opt-out (parent portal or staff).
 */
export async function setSmsContactOptOut(schoolId, phone, flags) {
  const sid = String(schoolId || '').trim()
  const phoneNormalized = normalizeZmPhoneNumber(phone)
  if (!sid || !phoneNormalized) throw new Error('schoolId and valid phone required')

  return prisma.smsContactOptOut.upsert({
    where: { schoolId_phoneNormalized: { schoolId: sid, phoneNormalized } },
    create: {
      schoolId: sid,
      phoneNormalized,
      optOutAll: Boolean(flags.optOutAll),
      optOutAttendance: Boolean(flags.optOutAttendance ?? flags.optOutAll),
      optOutFees: Boolean(flags.optOutFees ?? flags.optOutAll),
    },
    update: {
      ...(flags.optOutAll !== undefined ? { optOutAll: Boolean(flags.optOutAll) } : {}),
      ...(flags.optOutAttendance !== undefined
        ? { optOutAttendance: Boolean(flags.optOutAttendance) }
        : {}),
      ...(flags.optOutFees !== undefined ? { optOutFees: Boolean(flags.optOutFees) } : {}),
    },
  })
}
