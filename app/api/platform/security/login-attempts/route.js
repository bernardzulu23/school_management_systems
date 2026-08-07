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

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const grouped = await prisma.auditLog.groupBy({
    by: ['schoolId'],
    where: {
      action: 'LOGIN_FAILED',
      createdAt: { gte: since },
    },
    _count: { _all: true },
  })

  const schoolIds = grouped.map((g) => g.schoolId)
  const schools = schoolIds.length
    ? await prisma.school.findMany({
        where: { id: { in: schoolIds } },
        select: { id: true, name: true, subdomain: true },
      })
    : []
  const byId = new Map(schools.map((s) => [s.id, s]))

  const items = grouped
    .map((g) => ({
      schoolId: g.schoolId,
      schoolName: byId.get(g.schoolId)?.name || 'Unknown',
      subdomain: byId.get(g.schoolId)?.subdomain || null,
      failedCount: g._count?._all || 0,
    }))
    .sort((a, b) => b.failedCount - a.failedCount)

  return NextResponse.json({ success: true, items })
})
