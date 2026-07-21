/**
 * GET /api/admin/sms-gateway-status
 * Platform admin: fleet health — offline if lastSeenAt > 10 minutes.
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { basePrisma } from '@/lib/prisma/client'
import { secureJson } from '@/lib/security/api'

export const dynamic = 'force-dynamic'

const OFFLINE_MS = 10 * 60 * 1000

export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) {
    return auth.response as Response
  }
  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return secureJson({ error: gate.error }, { status: gate.status }, request)
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const gateways = await basePrisma.sMSGateway.findMany({
    include: {
      school: { select: { id: true, name: true, subdomain: true } },
      logs: {
        where: { createdAt: { gte: since }, channel: 'CUSTOM_GATEWAY' },
        select: { status: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const schoolIds = [...new Set(gateways.map((g) => g.schoolId))]
  const settingsRows =
    schoolIds.length > 0
      ? await basePrisma.schoolSmsSettings.findMany({
          where: { schoolId: { in: schoolIds } },
          select: { schoolId: true, customGatewayEnabled: true },
        })
      : []
  const enabledBySchool = new Map(
    settingsRows.map((s) => [s.schoolId, Boolean(s.customGatewayEnabled)])
  )

  const now = Date.now()
  const payload = gateways.map((g) => {
    const lastSeenMs = g.lastSeenAt ? g.lastSeenAt.getTime() : 0
    const offline = !g.lastSeenAt || now - lastSeenMs > OFFLINE_MS
    return {
      id: g.id,
      schoolId: g.schoolId,
      schoolName: g.school.name,
      subdomain: g.school.subdomain,
      deviceName: g.deviceName,
      isActive: g.isActive,
      customGatewayEnabled: enabledBySchool.get(g.schoolId) ?? false,
      lastSeenAt: g.lastSeenAt,
      lastHealthCheck: g.lastHealthCheck,
      phoneStatus: offline ? 'offline' : 'online',
      totalSent: g.totalSent,
      totalFailed: g.totalFailed,
      last24h: {
        sent: g.logs.filter((m) => m.status === 'SENT').length,
        failed: g.logs.filter((m) => m.status === 'FAILED').length,
        pending: g.logs.filter((m) => m.status === 'PENDING').length,
        dispatched: g.logs.filter((m) => m.status === 'DISPATCHED').length,
      },
    }
  })

  return NextResponse.json({ gateways: payload })
})
