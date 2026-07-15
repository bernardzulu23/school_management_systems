export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { NotificationPreferencesSchema } from '@/lib/schemas'
import {
  getOrCreateNotificationPreference,
  validateMandatoryChannels,
} from '@/lib/notifications/preferences'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response

  const prefs = await getOrCreateNotificationPreference(auth.user.id, tenant.schoolId)
  return NextResponse.json({ success: true, data: prefs })
})

export const PATCH = withErrorHandler(async function PATCH(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const data = await parseBodyOrThrow(request, NotificationPreferencesSchema)
  const existing = await getOrCreateNotificationPreference(auth.user.id, tenant.schoolId)

  const merged = {
    webPushEnabled: data.webPushEnabled ?? existing.webPushEnabled,
    emailEnabled: data.emailEnabled ?? existing.emailEnabled,
    smsEnabled: data.smsEnabled ?? existing.smsEnabled,
  }
  const check = validateMandatoryChannels(merged)
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 })
  }

  const updateResult = await prisma.notificationPreference.updateMany({
    where: { userId: auth.user.id, schoolId },
    data: {
      ...(data.webPushEnabled !== undefined ? { webPushEnabled: data.webPushEnabled } : {}),
      ...(data.emailEnabled !== undefined ? { emailEnabled: data.emailEnabled } : {}),
      ...(data.smsEnabled !== undefined ? { smsEnabled: data.smsEnabled } : {}),
      ...(data.quietHoursStart ? { quietHoursStart: data.quietHoursStart } : {}),
      ...(data.quietHoursEnd ? { quietHoursEnd: data.quietHoursEnd } : {}),
      ...(data.timezone ? { timezone: data.timezone } : {}),
    },
  })
  if (updateResult.count === 0) {
    return NextResponse.json({ error: 'Preferences not found' }, { status: 404 })
  }

  const updated = await prisma.notificationPreference.findFirst({
    where: { userId: auth.user.id, schoolId },
  })

  return NextResponse.json({ success: true, data: updated })
})
