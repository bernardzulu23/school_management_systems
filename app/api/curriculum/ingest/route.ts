import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import { parseSyllabus, parseSyllabusFromBuffer } from '@/lib/curriculum/syllabusParsing'

export const dynamic = 'force-dynamic'

/**
 * POST /api/curriculum/ingest
 * Body JSON: { pdfUrl, subject?, gradeOrForm? }
 * Or multipart: file (pdf) + optional subject, gradeOrForm
 */
export const POST = withErrorHandler(async function POST(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const contentType = String(request.headers.get('content-type') || '')
  let parsed
  let sourceUrl: string | null = null
  let overrideSubject: string | undefined
  let overrideGrade: string | undefined

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    overrideSubject = String(form.get('subject') || '').trim() || undefined
    overrideGrade = String(form.get('gradeOrForm') || form.get('grade') || '').trim() || undefined
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    parsed = await parseSyllabusFromBuffer(buf)
  } else {
    const body = await request.json().catch(() => ({}))
    const pdfUrl = String(body?.pdfUrl || '').trim()
    overrideSubject = String(body?.subject || '').trim() || undefined
    overrideGrade = String(body?.gradeOrForm || body?.grade || '').trim() || undefined
    if (!pdfUrl) {
      return NextResponse.json({ error: 'pdfUrl or multipart file required' }, { status: 400 })
    }
    if (!/^https?:\/\//i.test(pdfUrl)) {
      return NextResponse.json({ error: 'pdfUrl must be http(s)' }, { status: 400 })
    }
    sourceUrl = pdfUrl
    parsed = await parseSyllabus(pdfUrl)
  }

  const subject = overrideSubject || parsed.subject
  const gradeOrForm = overrideGrade || parsed.grade

  const guard = validateAIGuardrails({
    text: `${subject} ${gradeOrForm} syllabus curriculum ${parsed.units.map((u) => u.title).join(' ')}`,
  })
  if (guard.ok === false) return guard.response

  const existing = await prisma.curriculum.findFirst({
    where: {
      schoolId,
      subject: { equals: subject, mode: 'insensitive' },
      gradeOrForm: { equals: gradeOrForm, mode: 'insensitive' },
    },
  })

  let curriculum
  if (existing) {
    const updateResult = await prisma.curriculum.updateMany({
      where: { id: existing.id, schoolId },
      data: {
        subject,
        gradeOrForm,
        source: 'pdf',
        sourceUrl,
        meta: {
          learningOutcomes: parsed.learningOutcomes,
          suggestedActivities: parsed.suggestedActivities,
          rawTextLength: parsed.rawTextLength,
        },
        updatedAt: new Date(),
      },
    })
    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 })
    }
    curriculum = await prisma.curriculum.findFirst({ where: { id: existing.id, schoolId } })
  } else {
    curriculum = await prisma.curriculum.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        subject,
        gradeOrForm,
        source: 'pdf',
        sourceUrl,
        meta: {
          learningOutcomes: parsed.learningOutcomes,
          suggestedActivities: parsed.suggestedActivities,
          rawTextLength: parsed.rawTextLength,
        },
      },
    })
  }

  if (!curriculum) {
    return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 })
  }

  await prisma.curriculumUnit.deleteMany({
    where: { curriculumId: curriculum.id, curriculum: { schoolId } },
  })
  if (parsed.units.length) {
    await prisma.curriculumUnit.createMany({
      ...(schoolId ? {} : {}),
      data: parsed.units.map((u, i) => ({
        id: crypto.randomUUID(),
        curriculumId: curriculum.id,
        title: u.title,
        topics: u.topics,
        outcomes: u.outcomes,
        activities: u.activities,
        assessment: u.assessment,
        resources: u.resources,
        durationMinutes: u.durationMinutes ?? null,
        weekHint: u.weekHint ?? null,
        sortOrder: u.sortOrder ?? i,
      })),
    })
  }

  const withUnits = await prisma.curriculum.findFirst({
    where: { id: curriculum.id, schoolId },
    include: { units: { orderBy: { sortOrder: 'asc' } } },
  })

  return NextResponse.json({ success: true, curriculum: withUnits })
})
