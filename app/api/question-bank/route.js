export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'

function mapQuestionBank(item) {
  const questions = Array.isArray(item.questions) ? item.questions : item.questions?.questions || []
  return {
    id: item.id,
    title: item.title,
    subject: item.subjectName || item.subject?.name || item.subject,
    subjectId: item.subjectId,
    formLevel: item.formLevel,
    difficulty: item.difficulty,
    questionCount: questions.length,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    content: { questions, grade: item.grade },
    source: 'ecz_question_bank',
  }
}

function mapLegacyGame(g) {
  return {
    id: g.id,
    title: g.title,
    subject: g.subject,
    subjectId: null,
    formLevel: g.content?.formLevel,
    difficulty: g.difficulty,
    questionCount: Array.isArray(g.content?.questions) ? g.content.questions.length : 0,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    content: g.content,
    source: 'legacy_game',
  }
}

export async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: staffRoleDeniedMessage(auth.user?.role) }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const subject = String(searchParams.get('subject') || '').trim()
  const subjectId = String(searchParams.get('subjectId') || '').trim()

  const [banks, legacy] = await Promise.all([
    prisma.questionBank.findMany({
      where: {
        schoolId,
        ...(subjectId
          ? { subjectId }
          : subject
            ? { subjectName: { contains: subject, mode: 'insensitive' } }
            : {}),
      },
      include: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.game.findMany({
      where: {
        schoolId,
        type: 'question_bank',
        ...(subject ? { subject: { contains: subject, mode: 'insensitive' } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const data = [...banks.map(mapQuestionBank), ...legacy.map(mapLegacyGame)]

  return NextResponse.json({ success: true, data })
}

export async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: staffRoleDeniedMessage(auth.user?.role) }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const title = String(body?.title || '').trim()
  const subjectName = String(body?.subject || body?.subjectName || '').trim()
  const subjectId = body?.subjectId ? String(body.subjectId).trim() : null
  const grade = body?.grade ? String(body.grade).trim() : null
  const formLevel = body?.formLevel ? parseInt(body.formLevel, 10) : null
  const difficulty = String(body?.difficulty || 'medium').trim() || 'medium'
  const questions = Array.isArray(body?.questions) ? body.questions : []

  if (!title || (!subjectName && !subjectId)) {
    return NextResponse.json(
      { error: 'title and subject (or subjectId) required' },
      { status: 400 }
    )
  }

  let resolvedSubjectName = subjectName
  if (subjectId) {
    const subj = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } })
    if (!subj) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    resolvedSubjectName = subj.name
  }

  const created = await prisma.questionBank.create({
    data: {
      title,
      description: grade ? `Grade ${grade}` : null,
      subjectId,
      subjectName: resolvedSubjectName,
      formLevel,
      grade,
      difficulty,
      questions,
      schoolId,
      createdBy: auth.user.id,
    },
    include: { subject: true },
  })

  return NextResponse.json({ success: true, data: mapQuestionBank(created) }, { status: 201 })
}
