export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { ScheduleNotificationSchema } from '@/lib/schemas'
import { scheduleNotification } from '@/lib/notifications/dispatcher'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'admin', 'administrator', 'hod', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response

  const data = await parseBodyOrThrow(request, ScheduleNotificationSchema)
  const row = await scheduleNotification({
    schoolId: tenant.schoolId,
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    actionUrl: data.actionUrl,
    triggerDate: data.triggerDate,
    triggerTime: data.triggerTime,
    scheduledFor: data.scheduledFor,
    data: data.data,
    channels: data.channels,
  })

  return NextResponse.json({ success: true, data: row }, { status: 201 })
})
