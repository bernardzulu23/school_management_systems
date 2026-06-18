export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { SmsBalanceSettingsSchema } from '@/lib/schemas'
import { getOrCreateSmsSettings } from '@/lib/sms/balance'
import prisma from '@/lib/prisma'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const settings = await getOrCreateSmsSettings(schoolId)

  const recent = await prisma.smsBroadcast.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      status: true,
      validCount: true,
      sentCount: true,
      failedCount: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      smsBalance: settings.smsBalance,
      lowBalanceThreshold: settings.lowBalanceThreshold,
      lowBalanceAlertEmail: settings.lowBalanceAlertEmail,
      parentSmsAbsent: settings.parentSmsAbsent ?? true,
      parentSmsLate: settings.parentSmsLate ?? true,
      parentSmsPresent: settings.parentSmsPresent ?? false,
      parentSmsExcused: settings.parentSmsExcused ?? false,
      recentBroadcasts: recent,
    },
  })
})

export const PATCH = withErrorHandler(async function PATCH(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Only headteachers can update SMS alert settings', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const body = await parseBodyOrThrow(request, SmsBalanceSettingsSchema)

  const updated = await prisma.schoolSmsSettings.upsert({
    where: { schoolId },
    create: {
      schoolId,
      lowBalanceThreshold: body.lowBalanceThreshold ?? 50,
      lowBalanceAlertEmail: body.lowBalanceAlertEmail ?? null,
      ...(body.parentSmsAbsent !== undefined ? { parentSmsAbsent: body.parentSmsAbsent } : {}),
      ...(body.parentSmsLate !== undefined ? { parentSmsLate: body.parentSmsLate } : {}),
      ...(body.parentSmsPresent !== undefined ? { parentSmsPresent: body.parentSmsPresent } : {}),
      ...(body.parentSmsExcused !== undefined ? { parentSmsExcused: body.parentSmsExcused } : {}),
    },
    update: {
      ...(body.lowBalanceThreshold !== undefined
        ? { lowBalanceThreshold: body.lowBalanceThreshold }
        : {}),
      ...(body.lowBalanceAlertEmail !== undefined
        ? { lowBalanceAlertEmail: body.lowBalanceAlertEmail }
        : {}),
      ...(body.parentSmsAbsent !== undefined ? { parentSmsAbsent: body.parentSmsAbsent } : {}),
      ...(body.parentSmsLate !== undefined ? { parentSmsLate: body.parentSmsLate } : {}),
      ...(body.parentSmsPresent !== undefined ? { parentSmsPresent: body.parentSmsPresent } : {}),
      ...(body.parentSmsExcused !== undefined ? { parentSmsExcused: body.parentSmsExcused } : {}),
    },
  })

  return NextResponse.json({ success: true, data: updated })
})
