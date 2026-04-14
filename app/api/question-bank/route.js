import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const subject = String(searchParams.get('subject') || '').trim()

  const items = await prisma.game.findMany({
    where: {
      schoolId,
      type: 'question_bank',
      ...(subject ? { subject } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: items.map((g) => ({
      id: g.id,
      title: g.title,
      subject: g.subject,
      difficulty: g.difficulty,
      questionCount: Array.isArray(g.content?.questions) ? g.content.questions.length : 0,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      content: g.content,
    })),
  })
}

export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const title = String(body?.title || '').trim()
  const subject = String(body?.subject || '').trim()
  const grade = body?.grade ? String(body.grade).trim() : null
  const difficulty = String(body?.difficulty || 'medium').trim() || 'medium'
  const questions = Array.isArray(body?.questions) ? body.questions : []

  if (!title || !subject) {
    return NextResponse.json({ error: 'title and subject required' }, { status: 400 })
  }

  const created = await prisma.game.create({
    data: {
      title,
      description: grade ? `Grade ${grade}` : null,
      type: 'question_bank',
      subject,
      difficulty,
      content: { grade, questions },
      schoolId,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: created.id,
        title: created.title,
        subject: created.subject,
        difficulty: created.difficulty,
        content: created.content,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    },
    { status: 201 }
  )
}
