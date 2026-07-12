import prisma from '@/lib/prisma'
import {
  NOTIFICATION_RATE_LIMIT_PER_HOUR,
  SMS_MASTERY_THRESHOLD,
  TYPE_DEFAULT_CHANNELS,
} from '@/lib/notifications/constants'
import { sendNotificationEmail } from '@/lib/notifications/emailService'
import { sendNotificationSms } from '@/lib/notifications/smsService'
import { sendWebPushToUser } from '@/lib/notifications/webPushService'
import {
  filterChannelsByPreference,
  getOrCreateNotificationPreference,
} from '@/lib/notifications/preferences'
import { isQuietHours, resolveDispatchTime } from '@/lib/notifications/quietHours'

/**
 * Resolve channels for a notification type with Option B SMS thresholds.
 */
export function resolveChannelsForType(type, { metadata = {}, explicitChannels = null } = {}) {
  if (Array.isArray(explicitChannels) && explicitChannels.length) {
    return explicitChannels
  }

  const base = [...(TYPE_DEFAULT_CHANNELS[type] || ['WEB_PUSH', 'EMAIL'])]

  if (type === 'TEST_DATE_REMINDER') {
    const daysBefore = Number(metadata.daysBefore ?? metadata.daysUntil ?? 999)
    if (daysBefore === 1 && !base.includes('SMS')) base.push('SMS')
    else base.splice(base.indexOf('SMS'), 1)
  }

  if (type === 'LOW_MASTERY_ALERT') {
    const score = Number(metadata.masteryScore ?? metadata.score ?? 100)
    if (score < SMS_MASTERY_THRESHOLD && !base.includes('SMS')) base.push('SMS')
    else {
      const idx = base.indexOf('SMS')
      if (idx >= 0) base.splice(idx, 1)
    }
  }

  return base
}

export async function checkRateLimit(userId) {
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const count = await prisma.notification.count({
    where: { userId: String(userId), createdAt: { gte: since } },
  })
  return count < NOTIFICATION_RATE_LIMIT_PER_HOUR
}

async function deliverChannel(channel, ctx) {
  const { user, schoolName, title, message, actionUrl } = ctx

  if (channel === 'WEB_PUSH') {
    return sendWebPushToUser({
      userId: user.id,
      title,
      message,
      actionUrl,
    })
  }

  if (channel === 'EMAIL') {
    return sendNotificationEmail({
      to: user.email,
      schoolName,
      title,
      message,
      actionUrl,
    })
  }

  if (channel === 'SMS') {
    return sendNotificationSms({
      phoneNumber: user.contact_number,
      message: `${title}: ${message}`.slice(0, 480),
    })
  }

  return { ok: false, error: `Unknown channel ${channel}` }
}

async function logDelivery(notificationId, channel, result) {
  const status = result.ok ? 'SENT' : 'FAILED'
  return prisma.notificationLog.create({
    data: {
      notificationId,
      channel,
      status,
      provider:
        result.provider ||
        (channel === 'EMAIL' ? 'RESEND' : channel === 'SMS' ? 'AWS_SNS' : 'WEB_PUSH'),
      providerId: result.providerId || null,
      error: result.error || null,
      sentAt: result.ok ? new Date() : null,
      deliveredAt: result.ok ? new Date() : null,
    },
  })
}

/**
 * Send notification immediately across enabled channels.
 */
export async function dispatchNotification({
  schoolId,
  userId,
  type,
  title,
  message,
  actionUrl,
  channels: explicitChannels,
  metadata = {},
}) {
  const user = await prisma.user.findFirst({
    where: { id: String(userId), schoolId: String(schoolId) },
    select: {
      id: true,
      email: true,
      contact_number: true,
      name: true,
      school: { select: { name: true } },
    },
  })
  if (!user) {
    return { ok: false, error: 'User not found' }
  }

  const withinLimit = await checkRateLimit(userId)
  if (!withinLimit) {
    return { ok: false, error: 'Rate limit exceeded (10 notifications per hour)' }
  }

  const prefs = await getOrCreateNotificationPreference(userId, schoolId)
  const requested = resolveChannelsForType(type, { metadata, explicitChannels })
  const channels = filterChannelsByPreference(requested, prefs)

  const notification = await prisma.notification.create({
    data: {
      schoolId: String(schoolId),
      userId: String(userId),
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      status: 'PENDING',
      metadata: metadata && Object.keys(metadata).length ? metadata : undefined,
    },
  })

  const schoolName = user.school?.name || 'ZSMS'
  let anySent = false
  const logs = []

  for (const channel of channels) {
    const result = await deliverChannel(channel, {
      user,
      schoolName,
      title,
      message,
      actionUrl,
    })
    const log = await logDelivery(notification.id, channel, result)
    logs.push(log)
    if (result.ok) anySent = true
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: anySent ? 'SENT' : 'FAILED',
      sentAt: anySent ? new Date() : null,
    },
  })

  return { ok: anySent, notification: updated, logs }
}

/** Retry a single channel for an existing notification (cron retries). */
export async function retryNotificationChannel(notification, channel) {
  const user = await prisma.user.findFirst({
    where: { id: notification.userId },
    select: {
      id: true,
      email: true,
      contact_number: true,
      school: { select: { name: true } },
    },
  })
  if (!user) return { ok: false, error: 'User not found' }

  const result = await deliverChannel(channel, {
    user,
    schoolName: user.school?.name || 'ZSMS',
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl,
  })
  const log = await logDelivery(notification.id, channel, result)
  return { ok: result.ok, log }
}

/**
 * Queue for quiet hours or future schedule.
 */
export async function queueNotification({
  schoolId,
  userId,
  type,
  title,
  message,
  actionUrl,
  scheduledFor,
  channels,
  data,
}) {
  const row = await prisma.scheduledNotification.create({
    data: {
      schoolId: String(schoolId),
      userId: String(userId),
      type,
      title: title || null,
      message: message || null,
      actionUrl: actionUrl || null,
      scheduledFor: new Date(scheduledFor),
      channels: channels || null,
      data: data || null,
      status: 'PENDING',
    },
  })

  await prisma.notification.create({
    data: {
      schoolId: String(schoolId),
      userId: String(userId),
      type,
      title: title || type,
      message: message || '',
      actionUrl: actionUrl || null,
      status: 'QUEUED',
      metadata: data || undefined,
    },
  })

  return row
}

/**
 * Main entry for integrations — handles quiet hours + dispatch vs queue.
 */
export async function sendImmediateNotification(input) {
  const {
    schoolId,
    userId,
    type,
    title,
    message,
    actionUrl,
    channels,
    metadata,
    force = false,
  } = input

  const prefs = await getOrCreateNotificationPreference(userId, schoolId)
  const now = new Date()

  if (!force && isQuietHours(now, prefs)) {
    const scheduledFor = resolveDispatchTime(now, prefs)
    const queued = await queueNotification({
      schoolId,
      userId,
      type,
      title,
      message,
      actionUrl,
      scheduledFor,
      channels,
      data: { ...metadata, queuedReason: 'quiet_hours' },
    })
    return { ok: true, queued: true, scheduledFor, scheduledNotification: queued }
  }

  return dispatchNotification({
    schoolId,
    userId,
    type,
    title,
    message,
    actionUrl,
    channels,
    metadata,
  })
}

export async function scheduleNotification({
  schoolId,
  userId,
  type,
  title,
  message,
  actionUrl,
  triggerDate,
  triggerTime,
  scheduledFor,
  data,
  channels,
}) {
  let when = scheduledFor ? new Date(scheduledFor) : null
  if (!when && triggerDate) {
    const base = new Date(triggerDate)
    if (triggerTime) {
      const [h, m] = String(triggerTime).split(':').map(Number)
      base.setHours(h || 0, m || 0, 0, 0)
    }
    when = base
  }
  if (!when || Number.isNaN(when.getTime())) {
    throw new Error('scheduledFor or triggerDate is required')
  }

  return prisma.scheduledNotification.create({
    data: {
      schoolId: String(schoolId),
      userId: String(userId),
      type,
      title: title || null,
      message: message || null,
      actionUrl: actionUrl || null,
      triggerDate: triggerDate ? new Date(triggerDate) : null,
      triggerTime: triggerTime || null,
      scheduledFor: when,
      data: data || null,
      channels: channels || null,
      status: 'PENDING',
    },
  })
}
