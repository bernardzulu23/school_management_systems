import prisma from '@/lib/prisma'
import {
  DEFAULT_QUIET_END,
  DEFAULT_QUIET_START,
  DEFAULT_TIMEZONE,
} from '@/lib/notifications/constants'

export async function getOrCreateNotificationPreference(userId, schoolId) {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId: String(userId) },
  })
  if (existing) return existing

  return prisma.notificationPreference.create({
    data: {
      userId: String(userId),
      schoolId: String(schoolId),
      webPushEnabled: true,
      emailEnabled: true,
      smsEnabled: true,
      quietHoursStart: DEFAULT_QUIET_START,
      quietHoursEnd: DEFAULT_QUIET_END,
      timezone: DEFAULT_TIMEZONE,
    },
  })
}

/** At least one delivery channel must remain enabled (mandatory notifications). */
export function validateMandatoryChannels(prefs) {
  const web = Boolean(prefs.webPushEnabled)
  const email = Boolean(prefs.emailEnabled)
  const sms = Boolean(prefs.smsEnabled)
  if (!web && !email && !sms) {
    return { ok: false, error: 'At least one notification channel must stay enabled' }
  }
  return { ok: true }
}

export function filterChannelsByPreference(channels, prefs) {
  const enabled = []
  for (const ch of channels) {
    if (ch === 'WEB_PUSH' && prefs.webPushEnabled) enabled.push(ch)
    if (ch === 'EMAIL' && prefs.emailEnabled) enabled.push(ch)
    if (ch === 'SMS' && prefs.smsEnabled) enabled.push(ch)
  }
  if (enabled.length === 0) {
    if (prefs.webPushEnabled) enabled.push('WEB_PUSH')
    else if (prefs.emailEnabled) enabled.push('EMAIL')
    else if (prefs.smsEnabled) enabled.push('SMS')
    else enabled.push('EMAIL')
  }
  return enabled
}
