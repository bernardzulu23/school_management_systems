export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const POST = withErrorHandler(async function POST(request, { params }) {
  const routeParams = await params
  const notificationId = String(routeParams?.notificationId || '').trim()
  if (!notificationId) throw new ApiError('notificationId is required', 400)

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const notification = await prisma.allocationNotification.findFirst({
    where: { id: notificationId, schoolId, adminUserId: auth.user.id },
    select: { id: true },
  })
  if (!notification) throw new ApiError('Not found', 404)

  const updated = await prisma.allocationNotification.update({
    where: { id: notification.id },
    data: { read: true, readAt: new Date() },
    select: { read: true, readAt: true },
  })

  return NextResponse.json({ read: updated.read, readAt: updated.readAt })
})
