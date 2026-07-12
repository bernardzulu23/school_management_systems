export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeSicPortal } from '@/lib/sic/routeAuth'
import { z } from 'zod'

const CreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  meetingDate: z.string().datetime(),
  agenda: z.string().trim().max(5000).optional().nullable(),
})

const MinutesSchema = z.object({
  id: z.string().min(1).max(64),
  minutes: z.string().trim().min(5).max(20000),
})

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeSicPortal(request)
  if (!authz.ok) return authz.response
  const db = getTenantClient(authz.schoolId)
  const rows = await db.sicHimMeeting.findMany({
    orderBy: { meetingDate: 'desc' },
    include: { createdBy: { select: { id: true, name: true } } },
    take: 100,
  })
  return NextResponse.json({ success: true, data: rows })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeSicPortal(request)
  if (!authz.ok) return authz.response
  const parsed = CreateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new ApiError('Invalid HIM meeting', 400)

  const db = getTenantClient(authz.schoolId)
  const created = await db.sicHimMeeting.create({
    data: {
      schoolId: authz.schoolId,
      title: parsed.data.title,
      meetingDate: new Date(parsed.data.meetingDate),
      agenda: parsed.data.agenda || null,
      createdById: authz.auth.user.id,
    },
  })
  return NextResponse.json({ success: true, data: created }, { status: 201 })
})

export const PATCH = withErrorHandler(async function PATCH(request) {
  const authz = await authorizeSicPortal(request)
  if (!authz.ok) return authz.response
  const parsed = MinutesSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new ApiError('Invalid minutes update', 400)

  const db = getTenantClient(authz.schoolId)
  const row = await db.sicHimMeeting.findFirst({ where: { id: parsed.data.id } })
  if (!row) throw new ApiError('Not found', 404)

  const updated = await db.sicHimMeeting.update({
    where: { id: row.id },
    data: {
      minutes: parsed.data.minutes,
      minutesSubmittedAt: new Date(),
      status: 'completed',
    },
  })
  return NextResponse.json({ success: true, data: updated })
})
