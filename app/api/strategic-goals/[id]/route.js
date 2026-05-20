import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
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
  if (Number.isNaN(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function PUT(request, { params }) {
  const routeParams = await params
  const auth = await requireRole(request, ALLOWED_ROLES)
  if (!auth.isAuthenticated) return auth.response
  if (auth.denied) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const id = String(routeParams?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'Goal id is required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const data = {}

  if (body?.title !== undefined) {
    const title = String(body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    data.title = title
  }

  if (body?.description !== undefined) {
    data.description = body.description ? String(body.description).trim() : null
  }

  if (body?.status !== undefined) {
    data.status = normalizeStatus(body.status)
  }

  if (body?.progress !== undefined) {
    const p = clampProgress(body.progress)
    if (p === null) return NextResponse.json({ error: 'Invalid progress' }, { status: 400 })
    data.progress = p
  }

  if (body?.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === '') {
      data.dueDate = null
    } else {
      const d = new Date(String(body.dueDate))
      if (Number.isNaN(d.getTime()))
        return NextResponse.json({ error: 'Invalid due date' }, { status: 400 })
      data.dueDate = d
    }
  }

  const updated = await prisma.strategicGoal.updateMany({
    where: { id, schoolId },
    data,
  })

  if (updated.count === 0) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request, { params }) {
  const routeParams = await params
  const auth = await requireRole(request, ALLOWED_ROLES)
  if (!auth.isAuthenticated) return auth.response
  if (auth.denied) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const id = String(routeParams?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'Goal id is required' }, { status: 400 })

  const deleted = await prisma.strategicGoal.deleteMany({
    where: { id, schoolId },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
