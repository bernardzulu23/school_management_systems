/**
 * GET /api/admin/sms-gateway-logs?gatewayId=…
 * Platform admin: recent delivery logs for the school behind this gateway (AT + Android).
 */
import { NextResponse } from 'next/server'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { basePrisma } from '@/lib/prisma/client'
import { secureJson } from '@/lib/security/api'
import { outboundSmsWhere } from '@/lib/sms/outboundChannels'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) {
    return auth.response as Response
  }
  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return secureJson({ error: gate.error }, { status: gate.status }, request)
  }

  const { searchParams } = new URL(request.url)
  const gatewayId = String(searchParams.get('gatewayId') || '').trim()
  if (!gatewayId) throw new ApiError('gatewayId is required', 400)
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20))
  const channelOnly = String(searchParams.get('channel') || '')
    .trim()
    .toUpperCase()
  const filterSchoolId = String(searchParams.get('schoolId') || '').trim() || null

  const gateway = await basePrisma.sMSGateway.findUnique({
    where: { id: gatewayId },
    select: {
      id: true,
      deviceName: true,
      schoolId: true,
      isShared: true,
      school: { select: { name: true } },
    },
  })
  if (!gateway) throw new ApiError('Gateway not found', 404)

  // Dedicated gateway: always school-bound. Shared: optional schoolId isolates one tenant.
  let where
  if (gateway.isShared) {
    where = {
      gatewayId,
      channel: 'CUSTOM_GATEWAY' as const,
      ...(filterSchoolId ? { schoolId: filterSchoolId } : {}),
    }
  } else if (gateway.schoolId) {
    where =
      channelOnly === 'CUSTOM_GATEWAY'
        ? { gatewayId, channel: 'CUSTOM_GATEWAY' as const, schoolId: gateway.schoolId }
        : outboundSmsWhere({ schoolId: gateway.schoolId })
  } else {
    where = { gatewayId, channel: 'CUSTOM_GATEWAY' as const }
  }

  const logs = await basePrisma.smsLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      status: true,
      recipient: true,
      failureReason: true,
      createdAt: true,
      channel: true,
      provider: true,
      gatewayId: true,
      schoolId: true,
    },
  })

  return NextResponse.json({
    gateway: {
      id: gateway.id,
      deviceName: gateway.deviceName,
      schoolId: gateway.schoolId,
      isShared: Boolean(gateway.isShared),
      schoolName: gateway.isShared ? 'All schools (shared)' : gateway.school?.name || null,
      filterSchoolId,
    },
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  })
})
