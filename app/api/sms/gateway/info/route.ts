/**
 * GET /api/sms/gateway/info
 * School-scoped view of the platform shared Android SIM bridge.
 * Does not collide with POST /api/sms/gateway/status (Android delivery reports).
 */
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { basePrisma } from '@/lib/prisma/client'
import { outboundSmsWhere } from '@/lib/sms/outboundChannels'
import { resolveActiveGatewayForSchool } from '@/lib/sms/resolveGateway'

export const dynamic = 'force-dynamic'

const CONNECTED_MS = 10 * 60 * 1000

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const gateway = await resolveActiveGatewayForSchool(schoolId)

  const settings = await basePrisma.schoolSmsSettings.findUnique({
    where: { schoolId },
    select: { customGatewayEnabled: true },
  })

  const since = startOfToday()
  // School-wide outbound volume (Africa's Talking + Android gateway)
  const [sentToday, failedToday, totalSent, totalFailed] = await Promise.all([
    basePrisma.smsLog.count({
      where: outboundSmsWhere({ schoolId, status: 'SENT', createdAt: { gte: since } }),
    }),
    basePrisma.smsLog.count({
      where: outboundSmsWhere({
        schoolId,
        status: { in: ['FAILED', 'FAILED_NO_FALLBACK'] },
        createdAt: { gte: since },
      }),
    }),
    basePrisma.smsLog.count({
      where: outboundSmsWhere({ schoolId, status: 'SENT' }),
    }),
    basePrisma.smsLog.count({
      where: outboundSmsWhere({
        schoolId,
        status: { in: ['FAILED', 'FAILED_NO_FALLBACK'] },
      }),
    }),
  ])

  if (!gateway) {
    return NextResponse.json({
      success: true,
      status: 'not_configured',
      customGatewayEnabled: Boolean(settings?.customGatewayEnabled),
      gateway: null,
      sentToday,
      failedToday,
      totalSent,
      totalFailed,
    })
  }

  const lastSeenMs = gateway.lastSeenAt ? gateway.lastSeenAt.getTime() : 0
  const connected = Boolean(gateway.lastSeenAt) && Date.now() - lastSeenMs <= CONNECTED_MS

  return NextResponse.json({
    success: true,
    status: connected ? 'connected' : 'offline',
    customGatewayEnabled: Boolean(settings?.customGatewayEnabled),
    gateway: {
      id: gateway.id,
      idShort: `${gateway.id.slice(0, 8)}…`,
      deviceName: gateway.deviceName,
      isActive: gateway.isActive,
      isShared: Boolean(gateway.isShared),
      lastSeenAt: gateway.lastSeenAt,
      lastHealthCheck: gateway.lastHealthCheck,
    },
    sentToday,
    failedToday,
    totalSent,
    totalFailed,
    gatewayDeviceSent: gateway.totalSent,
    gatewayDeviceFailed: gateway.totalFailed,
  })
})
