import prisma from '@/lib/prisma'
import { sendImmediateNotification } from '@/lib/notifications/dispatcher'

/**
 * Integration hook — call from Teaching Hub, Timetable, Assessment, etc.
 *
 * @example
 * await onNotificationTrigger({
 *   schoolId, userId, type: 'LOW_MASTERY_ALERT',
 *   title: 'Low Mastery Alert',
 *   message: 'States of Matter 35% — reteach needed',
 *   actionUrl: '/dashboard/teacher/teaching-studio',
 *   metadata: { masteryScore: 35, topicName: 'States of Matter' },
 * })
 */
export async function onNotificationTrigger(payload) {
  return sendImmediateNotification(payload)
}

/**
 * Notify multiple staff users (teachers + admins).
 */
export async function notifyStaffUsers({ schoolId, userIds, ...rest }) {
  const results = []
  for (const userId of userIds) {
    results.push(
      await sendImmediateNotification({
        schoolId,
        userId,
        ...rest,
      })
    )
  }
  return results
}

export async function getSchoolAdminUserIds(schoolId) {
  const rows = await prisma.user.findMany({
    where: {
      schoolId: String(schoolId),
      role: { in: ['headteacher', 'ADMIN', 'admin', 'administrator'] },
    },
    select: { id: true },
  })
  return rows.map((r) => r.id)
}
