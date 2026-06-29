import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const id = await safeRouteParam(params, 'id')
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))

  const bank = await prisma.questionBank.findFirst({ where: { id, schoolId } })
  if (bank) {
    const questions = body?.questions ?? body?.content?.questions
    const updated = await prisma.questionBank.update({
      where: { id },
      data: {
        ...(body?.title !== undefined ? { title: String(body.title).trim() } : {}),
        ...(body?.subject !== undefined ? { subjectName: String(body.subject).trim() } : {}),
        ...(body?.difficulty !== undefined ? { difficulty: String(body.difficulty).trim() } : {}),
        ...(questions !== undefined ? { questions } : {}),
        ...(body?.formLevel !== undefined ? { formLevel: parseInt(body.formLevel, 10) } : {}),
      },
    })
    return NextResponse.json({ success: true, data: updated })
  }

  const existing = await prisma.game.findFirst({
    where: { id, schoolId, type: 'question_bank' },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.game.update({
    where: { id },
    data: {
      ...(body?.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body?.subject !== undefined ? { subject: String(body.subject).trim() } : {}),
      ...(body?.difficulty !== undefined ? { difficulty: String(body.difficulty).trim() } : {}),
      ...(body?.content !== undefined ? { content: body.content } : {}),
    },
  })

  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const id = await safeRouteParam(params, 'id')
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const bank = await prisma.questionBank.findFirst({
    where: { id, schoolId },
    select: { id: true },
  })
  if (bank) {
    await prisma.questionBank.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }

  const existing = await prisma.game.findFirst({
    where: { id, schoolId, type: 'question_bank' },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.game.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
