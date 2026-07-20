export const dynamic = 'force-dynamic'

import { withAILimits } from '@/lib/middleware/withAILimits'
import { NextResponse } from 'next/server'
import { generateAIText } from '@/lib/ai/client'
import { buildRagContextForQuery, appendRagToSystemPrompt } from '@/lib/ai/rag-context'
import { trackAIUsage } from '@/lib/middleware/aiUsageTracker'
import { PLAIN_TEXT_OUTPUT_RULES, sanitizePlainText } from '@/lib/ai/plain-text'
import { authorizeAiRoute } from '@/lib/ai/routeAuth'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import { getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/cache'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { roleCheck } from '@/lib/middleware/auth'
import {
  assertStudentSubjectAllowed,
  resolveStudentGradeLabel,
} from '@/lib/flashcards/studentSubjects'

const SYSTEM = `You are a helpful study assistant for Zambian CBC students. Answer clearly using school materials and official CDC syllabus excerpts when provided. Cite [Ref N] / [CDC N] when using references.

${PLAIN_TEXT_OUTPUT_RULES}`

/**
 * POST /api/ai/study-assistant — RAG-grounded Q&A scoped to school materials + curriculum.
 * Students must pick an enrolled subject; teachers may use any subject.
 */
export const POST = withAILimits(async function POST(request) {
  const access = await authorizeAiRoute(request, {
    roles: ['student', 'STUDENT', 'teacher', 'TEACHER'],
    featureId: 'ai-study-assistant',
    rateLimitPrefix: 'ai_study_assistant_',
  })
  if (!access.ok) return access.response

  const { schoolId, school, user } = access
  const body = await request.json().catch(() => ({}))
  const question = safeQueryString(body.question, { maxLength: 2000 })
  let subject = safeQueryString(body.subject, { maxLength: 128 })
  let gradeLevel = safeQueryString(body.gradeLevel || body.grade || '', { maxLength: 40 })

  if (!question) {
    return NextResponse.json(
      { error: 'question is required', code: 'MISSING_QUESTION' },
      { status: 400 }
    )
  }

  const isStudent = roleCheck(user, ['STUDENT', 'student'])
  if (isStudent) {
    if (!subject) {
      return NextResponse.json(
        { error: 'subject is required', code: 'MISSING_SUBJECT' },
        { status: 400 }
      )
    }
    const db = getTenantClient(schoolId)
    const student = await db.student.findFirst({
      where: { schoolId, userId: user.id },
      select: {
        id: true,
        class: true,
        classRef: { select: { year_group: true } },
      },
    })
    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found', code: 'STUDENT_NOT_FOUND' },
        { status: 404 }
      )
    }
    try {
      subject = await assertStudentSubjectAllowed(student.id, schoolId, subject, {
        action: 'ask about',
      })
    } catch (e) {
      return NextResponse.json(
        { error: e?.message || 'Subject not enrolled', code: 'SUBJECT_FORBIDDEN' },
        { status: e?.status || 403 }
      )
    }
    gradeLevel = resolveStudentGradeLabel(student) || gradeLevel || 'Form 1'
  }

  const guard = validateAIGuardrails({ text: `${subject || ''} ${question}` })
  if (!guard.ok) return guard.response

  const cachePayload = {
    schoolId,
    subject: subject || null,
    gradeLevel: gradeLevel || null,
    question,
  }
  const cached = await getCachedAIResponse('study-assistant', cachePayload)
  if (cached) {
    return NextResponse.json(cached)
  }

  const rag = await buildRagContextForQuery({
    query: `${subject || ''} ${question}`,
    schoolId,
    schoolPlan: school?.plan,
    subject: subject || null,
    gradeLevel: gradeLevel || null,
  })

  const system = rag.block ? appendRagToSystemPrompt(SYSTEM, rag.block) : SYSTEM

  const { text } = await generateAIText(question, {
    system,
    maxTokens: 1200,
    temperature: 0.4,
  })

  await trackAIUsage(schoolId, 'study-assistant')

  const answer = sanitizePlainText(text)
  const refs = rag.refs?.slice(0, 8) || []
  const responsePayload = {
    success: true,
    answer,
    refs,
    data: {
      answer,
      refs,
    },
  }
  await setCachedAIResponse('study-assistant', cachePayload, responsePayload)

  return NextResponse.json(responsePayload)
})
