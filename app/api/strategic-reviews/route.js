export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { requireRole } from '@/lib/middleware/requireRole'

const ALLOWED_ROLES = ['headteacher', 'HOD', 'hod']

export async function GET(request) {
  const auth = await requireRole(request, ALLOWED_ROLES)
  if (!auth.isAuthenticated) return auth.response
  if (auth.denied) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const take = Math.max(1, Math.min(20, Number(searchParams.get('take') || 10)))
  const now = new Date()

  const reviews = await prisma.strategicReview.findMany({
    where: { schoolId, scheduledAt: { gte: now } },
    orderBy: { scheduledAt: 'asc' },
    take,
    select: {
      id: true,
      title: true,
      notes: true,
      scheduledAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ success: true, data: reviews })
}

export async function POST(request) {
  const auth = await requireRole(request, ALLOWED_ROLES)
  if (!auth.isAuthenticated) return auth.response
  if (auth.denied) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const title = String(body?.title || '').trim()
  const notes = body?.notes ? String(body.notes).trim() : null
  const scheduledAt = body?.scheduledAt ? new Date(String(body.scheduledAt)) : null

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduled date' }, { status: 400 })
  }

  const review = await prisma.strategicReview.create({
    data: {
      title,
      notes,
      scheduledAt,
      schoolId,
      createdById: auth.user?.id || null,
    },
    select: { id: true, title: true, notes: true, scheduledAt: true, createdAt: true },
  })

  return NextResponse.json({ success: true, data: review }, { status: 201 })
}
