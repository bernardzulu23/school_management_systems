import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function PUT(request, { params }) {
  const routeParams = await params
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const id = String(routeParams?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const title = body?.title !== undefined ? String(body.title || '').trim() : undefined
  const subject = body?.subject !== undefined ? String(body.subject || '').trim() : undefined
  const difficulty =
    body?.difficulty !== undefined ? String(body.difficulty || '').trim() : undefined
  const content = body?.content !== undefined ? body.content : undefined

  const existing = await prisma.game.findFirst({
    where: { id, schoolId, type: 'question_bank' },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.game.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(difficulty !== undefined ? { difficulty } : {}),
      ...(content !== undefined ? { content } : {}),
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.title,
      subject: updated.subject,
      difficulty: updated.difficulty,
      content: updated.content,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
}

export async function DELETE(request, { params }) {
  const routeParams = await params
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const id = String(routeParams?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await prisma.game.findFirst({
    where: { id, schoolId, type: 'question_bank' },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.game.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
