export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { SendImmediateNotificationSchema } from '@/lib/schemas'
import { sendImmediateNotification } from '@/lib/notifications/dispatcher'

function isCronAuthorized(request) {
  const secret = String(process.env.CRON_SECRET || '').trim()
  if (!secret) return false
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const cronHeader = request.headers.get('x-cron-secret') || ''
  return bearer === secret || cronHeader === secret
}

export const POST = withErrorHandler(async function POST(request) {
  const cron = isCronAuthorized(request)
  const raw = await request.json().catch(() => null)
  if (!raw) throw new ApiError('Invalid JSON body', 400)

  let schoolId

  if (cron) {
    schoolId = String(raw.schoolId || '').trim()
    if (!schoolId) throw new ApiError('schoolId required for cron sends', 400)
  } else {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'admin', 'administrator'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    schoolId = tenant.schoolId
  }

  const parsed = SendImmediateNotificationSchema.safeParse(raw)
  if (!parsed.success) throw new ApiError('Invalid notification payload', 400)
  const data = parsed.data

  const result = await sendImmediateNotification({
    schoolId,
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    actionUrl: data.actionUrl || undefined,
    channels: data.channels,
    metadata: data.metadata,
    force: data.force,
  })

  if (result.error && !result.ok && !result.queued) {
    throw new ApiError(result.error, 429)
  }

  return NextResponse.json({ success: true, data: result }, { status: 201 })
})
