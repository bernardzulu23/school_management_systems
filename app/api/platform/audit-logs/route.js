export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

function decodeCursor(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(String(raw), 'base64url').toString('utf8'))
    if (parsed?.createdAt && parsed?.id) {
      return { createdAt: new Date(parsed.createdAt), id: String(parsed.id) }
    }
  } catch {
    // ignore
  }
  return null
}

function encodeCursor(row) {
  if (!row?.createdAt || !row?.id) return null
  return Buffer.from(
    JSON.stringify({ createdAt: new Date(row.createdAt).toISOString(), id: row.id }),
    'utf8'
  ).toString('base64url')
}

export const GET = withSecureHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { searchParams } = new URL(request.url)
  const now = Date.now()
  const fromRaw = safeQueryString(searchParams.get('from'), { maxLength: 40 })
  const toRaw = safeQueryString(searchParams.get('to'), { maxLength: 40 })
  const from = fromRaw ? new Date(fromRaw) : new Date(now - 24 * 60 * 60 * 1000)
  const to = toRaw ? new Date(toRaw) : new Date(now)
  const schoolId = safeStringId(searchParams.get('schoolId'))
  const action = safeQueryString(searchParams.get('action'), { maxLength: 40 })
  const country = safeQueryString(searchParams.get('country'), { maxLength: 8 })
  const vpnOnly = String(searchParams.get('vpnOnly') || '').toLowerCase() === 'true'
  const anomalous = String(searchParams.get('anomalous') || '').toLowerCase() === 'true'
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const cursor = decodeCursor(safeQueryString(searchParams.get('cursor'), { maxLength: 200 }))

  const where = {
    createdAt: { gte: from, lte: to },
  }
  if (schoolId) where.schoolId = schoolId
  if (action && action !== 'ALL') where.action = action
  if (country) where.country = { equals: country, mode: 'insensitive' }
  if (vpnOnly) {
    where.OR = [{ isVpn: true }, { isTor: true }]
  }
  if (anomalous) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [{ isVpn: true }, { isTor: true }, { threatScore: { gt: 50 } }],
      },
    ]
  }
  if (cursor) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      },
    ]
  }

  const rows = await prisma.auditLog.findMany({
    where,
    include: {
      school: { select: { id: true, name: true, subdomain: true } },
      user: { select: { id: true, email: true, role: true, name: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null

  return NextResponse.json({
    success: true,
    items: items.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      schoolId: r.schoolId,
      schoolName: r.school?.name || (r.entity === 'PlatformAdmin' ? 'Platform' : null),
      subdomain: r.school?.subdomain || null,
      userId: r.userId,
      userEmail: r.user?.email || r.newValue?.email || null,
      userName: r.user?.name || null,
      role: r.user?.role || r.newValue?.role || null,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      country: r.country,
      city: r.city,
      region: r.region,
      isp: r.isp,
      isVpn: r.isVpn,
      isTor: r.isTor,
      isProxy: r.isProxy,
      threatScore: r.threatScore,
      newValue: r.newValue,
    })),
    nextCursor,
    from: from.toISOString(),
    to: to.toISOString(),
  })
})
