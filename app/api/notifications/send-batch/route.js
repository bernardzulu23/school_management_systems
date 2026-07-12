export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { SendBatchNotificationSchema } from '@/lib/schemas'
import { sendImmediateNotification } from '@/lib/notifications/dispatcher'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'admin', 'administrator'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response

  const data = await parseBodyOrThrow(request, SendBatchNotificationSchema)
  const results = []

  for (const userId of data.userIds) {
    const result = await sendImmediateNotification({
      schoolId: tenant.schoolId,
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl || undefined,
      channels: data.channels,
    })
    results.push({ userId, ...result })
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        total: data.userIds.length,
        sent: results.filter((r) => r.ok).length,
        queued: results.filter((r) => r.queued).length,
        results,
      },
    },
    { status: 201 }
  )
})
