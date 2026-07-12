export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeSicPortal } from '@/lib/sic/routeAuth'
import { z } from 'zod'

const Schema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
})

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeSicPortal(request)
  if (!authz.ok) return authz.response
  const db = getTenantClient(authz.schoolId)
  const rows = await db.sicActivityPlan.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true } } },
    take: 100,
  })
  return NextResponse.json({ success: true, data: rows })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeSicPortal(request)
  if (!authz.ok) return authz.response
  const parsed = Schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new ApiError('Invalid activity plan', 400)

  const db = getTenantClient(authz.schoolId)
  const created = await db.sicActivityPlan.create({
    data: {
      schoolId: authz.schoolId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      createdById: authz.auth.user.id,
    },
  })
  return NextResponse.json({ success: true, data: created }, { status: 201 })
})
