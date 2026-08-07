export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeQueryString } from '@/lib/security/safeQueryValue'

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
  const resolvedParam = searchParams.get('resolved')
  const severity = safeQueryString(searchParams.get('severity'), { maxLength: 20 })
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
  const cursor = decodeCursor(safeQueryString(searchParams.get('cursor'), { maxLength: 200 }))

  const where = {}
  if (resolvedParam === 'true') where.resolved = true
  else if (resolvedParam === 'false') where.resolved = false
  if (severity) where.severity = severity
  if (cursor) {
    where.OR = [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ]
  }

  const rows = await prisma.securityAlert.findMany({
    where,
    include: {
      school: { select: { id: true, name: true, subdomain: true } },
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  return NextResponse.json({
    success: true,
    items: items.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      schoolId: a.schoolId,
      schoolName: a.school?.name || null,
      subdomain: a.school?.subdomain || null,
      email: a.email || a.user?.email || null,
      ipAddress: a.ipAddress,
      country: a.country,
      pattern: a.pattern,
      severity: a.severity,
      details: a.details,
      resolved: a.resolved,
      resolvedAt: a.resolvedAt,
    })),
    nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
  })
})
