export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireRole } from '@/lib/middleware/requireRole'

const ALLOWED_ROLES = ['headteacher', 'HOD', 'hod']

function normalizeStatus(value) {
  const s = String(value || '')
    .trim()
    .toLowerCase()
  if (s === 'completed') return 'completed'
  if (s === 'in_progress' || s === 'in progress') return 'in_progress'
  return 'not_started'
}

function clampProgress(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function GET(request) {
  const auth = await requireRole(request, ALLOWED_ROLES)
  if (!auth.isAuthenticated) return auth.response
  if (auth.denied) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const take = Math.max(1, Math.min(50, Number(searchParams.get('take') || 20)))

  const where = {
    schoolId,
    ...(status ? { status: normalizeStatus(status) } : {}),
  }

  const [goals, totals] = await Promise.all([
    prisma.strategicGoal.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        progress: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.strategicGoal.groupBy({
      by: ['status'],
      where: { schoolId },
      _count: { _all: true },
    }),
  ])

  const total = totals.reduce((acc, row) => acc + row._count._all, 0)
  const completed = totals.find((r) => r.status === 'completed')?._count._all ?? 0
  const in_progress = totals.find((r) => r.status === 'in_progress')?._count._all ?? 0
  const not_started = totals.find((r) => r.status === 'not_started')?._count._all ?? 0

  const progress_percentage =
    total === 0 ? 0 : Math.round(((completed + in_progress * 0.5) / total) * 100)
  const completion_rate = total === 0 ? 0 : Math.round((completed / total) * 100)

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total,
        completed,
        in_progress,
        not_started,
        progress_percentage,
        completion_rate,
      },
      goals,
    },
  })
}

export async function POST(request) {
  const auth = await requireRole(request, ALLOWED_ROLES)
  if (!auth.isAuthenticated) return auth.response
  if (auth.denied) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const title = String(body?.title || '').trim()
  const description = body?.description ? String(body.description).trim() : null
  const status = normalizeStatus(body?.status)
  const progress = clampProgress(body?.progress)
  const dueDate = body?.dueDate ? new Date(String(body.dueDate)) : null

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: 'Invalid due date' }, { status: 400 })
  }

  const goal = await prisma.strategicGoal.create({
    data: {
      title,
      description,
      status,
      progress,
      dueDate: dueDate || null,
      schoolId,
      createdById: auth.user?.id || null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      progress: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: goal }, { status: 201 })
}
