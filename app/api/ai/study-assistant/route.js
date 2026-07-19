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

const SYSTEM = `You are a helpful study assistant for Zambian CBC students. Answer clearly using school materials when provided. Cite [Ref N] when using references.

${PLAIN_TEXT_OUTPUT_RULES}`

/**
 * POST /api/ai/study-assistant — RAG-grounded Q&A scoped to school materials.
 */
export const POST = withAILimits(async function POST(request) {
  const access = await authorizeAiRoute(request, {
    roles: ['student', 'STUDENT', 'teacher', 'TEACHER'],
    featureId: 'ai-study-assistant',
    rateLimitPrefix: 'ai_study_assistant_',
  })
  if (!access.ok) return access.response

  const { schoolId, school } = access
  const body = await request.json().catch(() => ({}))
  const question = safeQueryString(body.question, { maxLength: 2000 })
  const subject = safeQueryString(body.subject, { maxLength: 128 })

  if (!question) {
    return NextResponse.json(
      { error: 'question is required', code: 'MISSING_QUESTION' },
      { status: 400 }
    )
  }
  const guard = validateAIGuardrails({ text: `${subject || ''} ${question}` })
  if (!guard.ok) return guard.response

  const cachePayload = { schoolId, subject: subject || null, question }
  const cached = await getCachedAIResponse('study-assistant', cachePayload)
  if (cached) {
    return NextResponse.json(cached)
  }

  const rag = await buildRagContextForQuery({
    query: `${subject || ''} ${question}`,
    schoolId,
    schoolPlan: school?.plan,
    subject,
  })

  const system = rag.block ? appendRagToSystemPrompt(SYSTEM, rag.block) : SYSTEM

  const { text } = await generateAIText(question, {
    system,
    maxTokens: 1200,
    temperature: 0.4,
  })

  await trackAIUsage(schoolId, 'study-assistant')

  const responsePayload = {
    success: true,
    data: {
      answer: sanitizePlainText(text),
      refs: rag.refs?.slice(0, 8) || [],
    },
  }
  await setCachedAIResponse('study-assistant', cachePayload, responsePayload)

  return NextResponse.json(responsePayload)
})
