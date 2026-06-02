import prisma from '@/lib/prisma'
import { sendSmsLowBalanceEmail } from '@/config/email'

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000

export async function getOrCreateSmsSettings(schoolId) {
  return prisma.schoolSmsSettings.upsert({
    where: { schoolId },
    create: { schoolId },
    update: {},
  })
}

export async function getSmsBalance(schoolId) {
  const row = await getOrCreateSmsSettings(schoolId)
  return row.smsBalance
}

/**
 * Atomically reserve credits before enqueueing. Returns false if insufficient.
 */
export async function reserveSmsCredits(schoolId, count) {
  const n = Math.max(0, Number(count) || 0)
  if (n === 0) return { ok: false, reason: 'No messages to send', balance: 0 }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.schoolSmsSettings.upsert({
      where: { schoolId },
      create: { schoolId, smsBalance: 0 },
      update: {},
    })

    const row = await tx.schoolSmsSettings.findUnique({ where: { schoolId } })
    if (!row || row.smsBalance < n) {
      return { ok: false, balance: row?.smsBalance ?? 0 }
    }

    const next = await tx.schoolSmsSettings.update({
      where: { schoolId },
      data: { smsBalance: { decrement: n } },
    })
    return { ok: true, balance: next.smsBalance }
  })

  if (updated.ok) {
    await maybeSendLowBalanceAlert(schoolId).catch((err) => {
      console.error('[SMS_LOW_BALANCE_ALERT]', err?.message || err)
    })
  }

  return updated.ok
    ? { ok: true, balance: updated.balance }
    : {
        ok: false,
        reason: `Insufficient SMS credits. Required: ${n}, balance: ${updated.balance}`,
        balance: updated.balance,
      }
}

/** Refund one credit when a message permanently fails after queue retries. */
export async function refundSmsCredit(schoolId, count = 1) {
  const n = Math.max(1, Number(count) || 1)
  await prisma.schoolSmsSettings.upsert({
    where: { schoolId },
    create: { schoolId, smsBalance: n },
    update: { smsBalance: { increment: n } },
  })
}

export async function maybeSendLowBalanceAlert(schoolId) {
  const settings = await prisma.schoolSmsSettings.findUnique({
    where: { schoolId },
    include: { school: { select: { name: true, email: true, subdomain: true } } },
  })
  if (!settings) return { sent: false }

  const threshold = settings.lowBalanceThreshold ?? 50
  if (settings.smsBalance > threshold) return { sent: false }

  const last = settings.lowBalanceAlertSentAt
  if (last && Date.now() - new Date(last).getTime() < ALERT_COOLDOWN_MS) {
    return { sent: false, reason: 'cooldown' }
  }

  const school = settings.school
  const recipients = []
  if (settings.lowBalanceAlertEmail) recipients.push(settings.lowBalanceAlertEmail)
  if (school?.email) recipients.push(school.email)

  const admins = await prisma.user.findMany({
    where: {
      schoolId,
      role: { in: ['headteacher', 'ADMIN', 'admin'] },
    },
    select: { email: true },
    take: 5,
  })
  for (const u of admins) {
    if (u.email) recipients.push(u.email)
  }

  const to = [...new Set(recipients.map((e) => String(e).trim().toLowerCase()).filter(Boolean))]
  if (!to.length) return { sent: false, reason: 'no_recipients' }

  const sent = await sendSmsLowBalanceEmail({
    to,
    schoolName: school?.name || 'Your school',
    balance: settings.smsBalance,
    threshold,
  })

  if (sent) {
    await prisma.schoolSmsSettings.update({
      where: { schoolId },
      data: { lowBalanceAlertSentAt: new Date() },
    })
  }

  return { sent: Boolean(sent), to: to.length }
}

/** Cron: alert schools below threshold even if no recent send. */
export async function runSmsLowBalanceCron() {
  const rows = await prisma.schoolSmsSettings.findMany({
    include: { school: { select: { name: true } } },
  })

  const list = rows.filter((r) => r.smsBalance <= (r.lowBalanceThreshold ?? 50))

  let alerted = 0
  for (const row of list) {
    const result = await maybeSendLowBalanceAlert(row.schoolId)
    if (result.sent) alerted += 1
  }

  return { checked: list.length, alerted }
}
