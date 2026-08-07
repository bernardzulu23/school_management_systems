export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const GET = withSecureHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const now = Date.now()
  const last24h = new Date(now - 24 * 60 * 60 * 1000)
  const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const lastHour = new Date(now - 60 * 60 * 1000)

  const [unresolvedAlerts, criticalAlerts, suspiciousIpGroups, failedLastHour] = await Promise.all([
    prisma.securityAlert.count({
      where: { resolved: false, createdAt: { gte: last24h } },
    }),
    prisma.securityAlert.count({
      where: {
        resolved: false,
        severity: 'critical',
        createdAt: { gte: last24h },
      },
    }),
    prisma.auditLog
      .groupBy({
        by: ['ipAddress'],
        where: {
          action: 'LOGIN_FAILED',
          createdAt: { gte: last7d },
          ipAddress: { not: null },
        },
        _count: { _all: true },
        having: { ipAddress: { _count: { gte: 3 } } },
      })
      .catch(async () => {
        // Fallback if having is unsupported in this Prisma version
        const rows = await prisma.auditLog.findMany({
          where: {
            action: 'LOGIN_FAILED',
            createdAt: { gte: last7d },
            ipAddress: { not: null },
          },
          select: { ipAddress: true },
        })
        const counts = new Map()
        for (const r of rows) {
          counts.set(r.ipAddress, (counts.get(r.ipAddress) || 0) + 1)
        }
        return [...counts.entries()]
          .filter(([, n]) => n >= 3)
          .map(([ipAddress, n]) => ({ ipAddress, _count: { _all: n } }))
      }),
    prisma.auditLog.groupBy({
      by: ['schoolId'],
      where: {
        action: 'LOGIN_FAILED',
        createdAt: { gte: lastHour },
      },
      _count: { _all: true },
    }),
  ])

  const schoolsUnderAttack = failedLastHour.filter((g) => (g._count?._all || 0) >= 5).length

  // Also count unresolved critical+high for nav badge
  const unresolvedCriticalHigh = await prisma.securityAlert.count({
    where: {
      resolved: false,
      severity: { in: ['critical', 'high'] },
    },
  })

  return NextResponse.json({
    success: true,
    unresolvedAlerts,
    criticalAlerts,
    suspiciousIps: Array.isArray(suspiciousIpGroups) ? suspiciousIpGroups.length : 0,
    schoolsUnderAttack,
    unresolvedCriticalHigh,
  })
})
