export const dynamic = 'force-dynamic'

import { withApiHandler, apiOk, ApiError } from '@/lib/middleware/withApiHandler'
import prisma from '@/lib/prisma'

/**
 * POST /api/admin/notifications/[notificationId]/read — Phase 3 example (admin domain).
 */
export const POST = withApiHandler(
  async ({ user, schoolId, params }) => {
    const notificationId = String(params?.notificationId || '').trim()
    if (!notificationId) {
      throw new ApiError('notificationId is required', 400, { code: 'VALIDATION_FAILED' })
    }

    const notification = await prisma.allocationNotification.findFirst({
      where: { id: notificationId, schoolId, adminUserId: user.id },
      select: { id: true },
    })
    if (!notification) throw new ApiError('Not found', 404, { code: 'NOT_FOUND' })

    const updateResult = await prisma.allocationNotification.updateMany({
      where: { id: notification.id, schoolId },
      data: { read: true, readAt: new Date() },
    })
    if (updateResult.count === 0) throw new ApiError('Not found', 404, { code: 'NOT_FOUND' })

    const updated = await prisma.allocationNotification.findFirst({
      where: { id: notification.id, schoolId },
      select: { read: true, readAt: true },
    })

    return apiOk({ read: updated.read, readAt: updated.readAt })
  },
  {
    roles: ['ADMIN', 'headteacher'],
  }
)
