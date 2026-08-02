/**
 * GET /api/admin/sms-gateway-metrics
 * Platform KPIs + 7-day volume/failure series for all outbound SMS (AT + Android gateway).
 */
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { basePrisma } from '@/lib/prisma/client'
import { secureJson } from '@/lib/security/api'
import { outboundSmsWhere } from '@/lib/sms/outboundChannels'

export const dynamic = 'force-dynamic'

const OFFLINE_MS = 10 * 60 * 1000
const ALERT_OFFLINE_MS = 30 * 60 * 1000
const TERMINAL = ['SENT', 'FAILED', 'FAILED_NO_FALLBACK'] as const

function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1)
  x.setHours(0, 0, 0, 0)
  return x
}

export const GET = withErrorHandler(async function GET(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated || !auth.user) {
    return auth.response as Response
  }
  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return secureJson({ error: gate.error }, { status: gate.status }, request)
  }

  const now = Date.now()
  const todayStart = startOfDay()
  const monthStart = startOfMonth()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

  const [gateways, monthSent, todayLogs, weekLogs] = await Promise.all([
    basePrisma.sMSGateway.findMany({
      select: {
        id: true,
        schoolId: true,
        deviceName: true,
        isActive: true,
        isShared: true,
        lastSeenAt: true,
        totalSent: true,
        totalFailed: true,
        school: { select: { name: true, subdomain: true } },
      },
    }),
    basePrisma.smsLog.count({
      where: outboundSmsWhere({
        status: 'SENT',
        createdAt: { gte: monthStart },
      }),
    }),
    basePrisma.smsLog.findMany({
      where: outboundSmsWhere({
        createdAt: { gte: todayStart },
        status: { in: [...TERMINAL] },
      }),
      select: { status: true, channel: true },
    }),
    basePrisma.smsLog.findMany({
      where: outboundSmsWhere({
        createdAt: { gte: sevenDaysAgo },
        status: { in: [...TERMINAL] },
      }),
      select: { status: true, createdAt: true },
    }),
  ])

  const activeGateways = gateways.filter((g) => g.isActive)
  const onlineGateways = activeGateways.filter((g) => {
    if (!g.lastSeenAt) return false
    return now - g.lastSeenAt.getTime() <= OFFLINE_MS
  })

  const todaySent = todayLogs.filter((l) => l.status === 'SENT').length
  const todayFailed = todayLogs.filter(
    (l) => l.status === 'FAILED' || l.status === 'FAILED_NO_FALLBACK'
  ).length
  const todayAt = todayLogs.filter((l) => l.channel === 'AFRICALA').length
  const todayGateway = todayLogs.filter((l) => l.channel === 'CUSTOM_GATEWAY').length
  const todayTotal = todaySent + todayFailed
  const failureRateToday = todayTotal > 0 ? (todayFailed / todayTotal) * 100 : 0

  const dayBuckets: Record<string, { date: string; sent: number; failed: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date(now - i * 24 * 60 * 60 * 1000))
    const key = d.toISOString().slice(0, 10)
    dayBuckets[key] = { date: key, sent: 0, failed: 0 }
  }
  for (const log of weekLogs) {
    const key = startOfDay(log.createdAt).toISOString().slice(0, 10)
    if (!dayBuckets[key]) continue
    if (log.status === 'SENT') dayBuckets[key].sent += 1
    else dayBuckets[key].failed += 1
  }
  const daily = Object.values(dayBuckets).map((b) => {
    const total = b.sent + b.failed
    return {
      ...b,
      failureRate: total > 0 ? Math.round((b.failed / total) * 1000) / 10 : 0,
    }
  })

  const alerts: {
    type: string
    severity: 'warn' | 'error'
    message: string
    gatewayId?: string
  }[] = []

  for (const g of activeGateways) {
    const lastMs = g.lastSeenAt ? g.lastSeenAt.getTime() : 0
    const offlineFor = g.lastSeenAt ? now - lastMs : Number.POSITIVE_INFINITY
    if (offlineFor > ALERT_OFFLINE_MS) {
      alerts.push({
        type: 'offline',
        severity: 'error',
        gatewayId: g.id,
        message: `${g.deviceName} (${g.isShared ? 'shared' : g.school?.name || 'unassigned'}) offline >30 min`,
      })
    }
  }

  if (todayTotal >= 5 && failureRateToday > 5) {
    alerts.push({
      type: 'failure_rate',
      severity: 'warn',
      message: `Fleet failure rate today ${failureRateToday.toFixed(1)}% (${todayFailed}/${todayTotal})`,
    })
  }

  // Per-gateway month sent (Android bridge only — device-scoped)
  const monthByGateway = await basePrisma.smsLog.groupBy({
    by: ['gatewayId'],
    where: {
      channel: 'CUSTOM_GATEWAY',
      status: 'SENT',
      createdAt: { gte: monthStart },
      gatewayId: { not: null },
    },
    _count: { _all: true },
  })
  const monthSentByGateway: Record<string, number> = {}
  for (const row of monthByGateway) {
    if (row.gatewayId) monthSentByGateway[row.gatewayId] = row._count._all
  }

  return NextResponse.json({
    kpis: {
      activeGateways: activeGateways.length,
      onlineGateways: onlineGateways.length,
      totalGateways: gateways.length,
      sentThisMonth: monthSent,
      failureRateToday: Math.round(failureRateToday * 10) / 10,
      todaySent,
      todayFailed,
      todayAt,
      todayGateway,
    },
    daily,
    alerts,
    monthSentByGateway,
  })
})
