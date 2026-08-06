export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { SendImmediateNotificationSchema } from '@/lib/schemas'
import { sendImmediateNotification } from '@/lib/notifications/dispatcher'
import { verifySendImmediateCronBinding } from '@/lib/security/cronTenantBinding'

function isCronAuthorized(request) {
  const secret = String(process.env.CRON_SECRET || '').trim()
  if (!secret) return false
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const cronHeader = request.headers.get('x-cron-secret') || ''
  return bearer === secret || cronHeader === secret
}

/**
 * Cron HTTP path: CRON_SECRET + HMAC binding + user must belong to schoolId.
 * Prefer in-process cron (notificationCron) which never trusts client schoolId.
 */
async function resolveCronSchoolId(request, raw) {
  const schoolId = String(raw.schoolId || '').trim()
  const userId = String(raw.userId || '').trim()
  if (!schoolId || !userId) {
    throw new ApiError('schoolId and userId required for cron sends', 400, {
      code: 'CRON_TENANT_REQUIRED',
    })
  }

  if (!verifySendImmediateCronBinding(request, schoolId, userId)) {
    throw new ApiError(
      'Missing or invalid x-zsms-cron-binding (HMAC of send-immediate:v1:schoolId:userId)',
      403,
      { code: 'CRON_BINDING_INVALID' }
    )
  }

  const school = await prisma.school.findFirst({
    where: { id: schoolId, active: true },
    select: { id: true },
  })
  if (!school) throw new ApiError('School not found', 404, { code: 'TENANT_NOT_FOUND' })

  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId },
    select: { id: true },
  })
  if (!user) {
    throw new ApiError('userId does not belong to schoolId', 403, {
      code: 'CRON_TENANT_MISMATCH',
    })
  }

  return schoolId
}

export const POST = withErrorHandler(async function POST(request) {
  const cron = isCronAuthorized(request)
  const raw = await request.json().catch(() => null)
  if (!raw) throw new ApiError('Invalid JSON body', 400)

  let schoolId

  if (cron) {
    schoolId = await resolveCronSchoolId(request, raw)
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

  // Defense: authenticated path also ensures target user is in the same school
  if (!cron) {
    const target = await prisma.user.findFirst({
      where: { id: data.userId, schoolId },
      select: { id: true },
    })
    if (!target) throw new ApiError('Target user not found in your school', 404)
  }

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
