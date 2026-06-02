export const dynamic = 'force-dynamic'

import { withAILimits } from '@/lib/middleware/withAILimits'
import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { generateAIText } from '@/lib/ai/client'
import { buildRagContextForQuery, appendRagToSystemPrompt } from '@/lib/ai/rag-context'
import { getSchoolPlanForUsage, trackAIUsage } from '@/lib/middleware/aiUsageTracker'

const SYSTEM =
  'You are a helpful study assistant for Zambian CBC students. Answer clearly using school materials when provided. Cite [Ref N] when using references.'

/**
 * POST /api/ai/study-assistant — RAG-grounded Q&A for students (Phase 3 P3.6).
 */
export const POST = withAILimits(async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!roleCheck(user, ['student', 'STUDENT', 'teacher', 'TEACHER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = String(user.schoolId || '').trim()
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const question = String(body.question || '').trim()
  const subject = String(body.subject || '').trim()

  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const school = await getSchoolPlanForUsage(schoolId)
  const rag = await buildRagContextForQuery({
    query: `${subject} ${question}`,
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

  return NextResponse.json({
    success: true,
    answer: text,
    refs: rag.refs?.slice(0, 8) || [],
  })
})
