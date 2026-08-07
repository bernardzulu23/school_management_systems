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

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const rows = await prisma.auditLog.findMany({
    where: {
      action: 'LOGIN_FAILED',
      createdAt: { gte: since },
      ipAddress: { not: null },
    },
    select: {
      ipAddress: true,
      schoolId: true,
      country: true,
      isp: true,
      isVpn: true,
      isTor: true,
      threatScore: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  const byIp = new Map()
  for (const r of rows) {
    const ip = r.ipAddress
    if (!ip) continue
    let entry = byIp.get(ip)
    if (!entry) {
      entry = {
        ip,
        country: r.country,
        isp: r.isp,
        isVpn: r.isVpn,
        isTor: r.isTor,
        threatScore: r.threatScore,
        failedAttempts: 0,
        schools: new Set(),
        lastSeen: r.createdAt,
      }
      byIp.set(ip, entry)
    }
    entry.failedAttempts += 1
    entry.schools.add(r.schoolId)
    if (r.createdAt > entry.lastSeen) entry.lastSeen = r.createdAt
    if (r.isVpn) entry.isVpn = true
    if (r.isTor) entry.isTor = true
    if ((r.threatScore ?? 0) > (entry.threatScore ?? 0)) entry.threatScore = r.threatScore
    if (!entry.country && r.country) entry.country = r.country
    if (!entry.isp && r.isp) entry.isp = r.isp
  }

  const blocked = await prisma.blockedIp.findMany({ select: { ip: true } })
  const blockedSet = new Set(blocked.map((b) => b.ip))

  const items = [...byIp.values()]
    .map((e) => ({
      ip: e.ip,
      country: e.country,
      isp: e.isp,
      isVpn: e.isVpn,
      isTor: e.isTor,
      threatScore: e.threatScore,
      failedAttempts: e.failedAttempts,
      schoolsTargeted: e.schools.size,
      lastSeen: e.lastSeen,
      blocked: blockedSet.has(e.ip),
    }))
    .sort((a, b) => b.failedAttempts - a.failedAttempts)
    .slice(0, 50)

  return NextResponse.json({ success: true, items })
})
