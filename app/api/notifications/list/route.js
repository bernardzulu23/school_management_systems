export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { NotificationListQuerySchema } from '@/lib/schemas'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const { searchParams } = new URL(request.url)
  const parsed = NotificationListQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  })
  const { limit, offset, status } = parsed.success
    ? parsed.data
    : { limit: 30, offset: 0, status: 'all' }

  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: auth.user.id,
        schoolId,
        ...(status === 'unread'
          ? { readAt: null, status: { in: ['SENT', 'QUEUED', 'PENDING'] } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        logs: {
          select: { channel: true, status: true, sentAt: true },
        },
      },
    }),
    prisma.notification.count({
      where: {
        userId: auth.user.id,
        schoolId,
        ...(status === 'unread'
          ? { readAt: null, status: { in: ['SENT', 'QUEUED', 'PENDING'] } }
          : {}),
      },
    }),
    prisma.notification.count({
      where: {
        userId: auth.user.id,
        schoolId,
        readAt: null,
        status: { in: ['SENT', 'QUEUED', 'PENDING'] },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: rows,
    pagination: { limit, offset, total, unreadCount },
  })
})
