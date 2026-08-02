/**
 * POST /api/sms/gateway/health-check
 * School admin: poll-based health from shared (or legacy) gateway lastSeenAt.
 */
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { basePrisma } from '@/lib/prisma/client'
import { resolveActiveGatewayForSchool } from '@/lib/sms/resolveGateway'

export const dynamic = 'force-dynamic'

const CONNECTED_MS = 10 * 60 * 1000

export const POST = withErrorHandler(async function POST(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const gateway = await resolveActiveGatewayForSchool(schoolId)

  if (!gateway) {
    return NextResponse.json({
      success: true,
      healthy: false,
      status: 'not_configured',
      reason: 'No active platform SMS gateway',
    })
  }

  const lastSeenMs = gateway.lastSeenAt ? gateway.lastSeenAt.getTime() : 0
  const healthy = Boolean(gateway.lastSeenAt) && Date.now() - lastSeenMs <= CONNECTED_MS

  if (healthy) {
    await basePrisma.sMSGateway.update({
      where: { id: gateway.id },
      data: { lastHealthCheck: new Date() },
    })
  }

  return NextResponse.json({
    success: true,
    healthy,
    status: healthy ? 'connected' : 'offline',
    lastSeenAt: gateway.lastSeenAt,
    lastHealthCheck: healthy ? new Date() : gateway.lastHealthCheck,
    deviceName: gateway.deviceName,
    isShared: Boolean(gateway.isShared),
  })
})
