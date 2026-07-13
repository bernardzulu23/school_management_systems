import prisma from '@/lib/prisma'
import { sendImmediateNotification } from '@/lib/notifications/dispatcher'
import {
  scheduleUpcomingClassReminders,
  scanMissedTests,
  generateWeeklySchemeProgressDigests,
} from '@/lib/notifications/integrations'

const MAX_RETRIES = 3

/**
 * Process due scheduled notifications (Vercel Hobby: daily cron; Pro/external for sub-daily).
 */
export async function processDueScheduledNotifications(limit = 100) {
  const now = new Date()
  const due = await prisma.scheduledNotification.findMany({
    where: { status: 'PENDING', scheduledFor: { lte: now } },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  })

  let sent = 0
  let failed = 0

  for (const row of due) {
    try {
      const result = await sendImmediateNotification({
        schoolId: row.schoolId,
        userId: row.userId,
        type: row.type,
        title: row.title || row.type,
        message: row.message || '',
        actionUrl: row.actionUrl || undefined,
        channels: Array.isArray(row.channels) ? row.channels : undefined,
        metadata: row.data && typeof row.data === 'object' ? row.data : {},
        force: Boolean(row.data?.queuedReason === 'quiet_hours'),
      })

      await prisma.scheduledNotification.update({
        where: { id: row.id },
        data: { status: result.ok || result.queued ? 'SENT' : 'CANCELLED' },
      })

      if (result.ok) sent += 1
      else failed += 1
    } catch {
      failed += 1
      await prisma.scheduledNotification.update({
        where: { id: row.id },
        data: { status: 'CANCELLED' },
      })
    }
  }

  return { processed: due.length, sent, failed }
}

/**
 * Retry failed channel deliveries.
 */
export async function retryFailedNotificationLogs(limit = 50) {
  const failed = await prisma.notificationLog.findMany({
    where: {
      status: 'FAILED',
      retryCount: { lt: MAX_RETRIES },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: {
      notification: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              contact_number: true,
              schoolId: true,
              school: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  let retried = 0
  let permanent = 0

  for (const log of failed) {
    const n = log.notification
    if (!n?.user) continue

    const { retryNotificationChannel } = await import('@/lib/notifications/dispatcher')
    const result = await retryNotificationChannel(n, log.channel)

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        retryCount: { increment: 1 },
        status: result.ok
          ? 'SENT'
          : log.retryCount + 1 >= MAX_RETRIES
            ? 'FAILED_PERMANENT'
            : 'FAILED',
        sentAt: result.ok ? new Date() : log.sentAt,
        error: result.ok ? null : log.error,
      },
    })

    if (result.ok) retried += 1
    else if (log.retryCount + 1 >= MAX_RETRIES) permanent += 1
  }

  return { retried, permanent, attempted: failed.length }
}

/**
 * Delete notifications older than 30 days.
 */
export async function cleanupOldNotifications() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff }, status: { in: ['SENT', 'READ', 'FAILED'] } },
  })
  return { deleted: result.count }
}

export async function runNotificationCronJobs() {
  const [due, retries, classReminders, missedTests] = await Promise.all([
    processDueScheduledNotifications(),
    retryFailedNotificationLogs(),
    scheduleUpcomingClassReminders(),
    scanMissedTests(),
  ])

  const cleanup = await cleanupOldNotifications()

  // Mondays ~07:00 UTC window (cron every 5 min): weekly scheme digests
  const now = new Date()
  let weeklyScheme = null
  if (now.getUTCDay() === 1 && now.getUTCHours() === 7 && now.getUTCMinutes() < 10) {
    weeklyScheme = await generateWeeklySchemeProgressDigests()
  }

  return {
    due,
    retries,
    cleanup,
    classReminders,
    missedTests,
    weeklyScheme,
  }
}
