export const dynamic = 'force-dynamic'
import { withAILimits } from '@/lib/middleware/withAILimits'
import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import {
  checkAILimit,
  getPerMinuteLimit,
  getSchoolPlanForUsage,
  trackAIUsage,
} from '@/lib/middleware/aiUsageTracker'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import {
  assertGroqConfigured,
  createGroqTextEventStream,
  GROQ_SSE_HEADERS,
} from '@/lib/ai/groq-client'
import {
  buildReportCommentPrompt,
  performanceLevelFromPercentage,
} from '@/lib/ai/subject-adaptive-prompts'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import { getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/cache'
import { aiChain, AI_SSE_HEADERS } from '@/lib/ai/provider-fallback'

export const POST = withAILimits(async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'HOD', 'ADMIN'])) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const schoolId = String(user.schoolId || '').trim()
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const perMinuteLimit = getPerMinuteLimit(school.plan)
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? perMinuteLimit : perMinuteLimit * 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai_report_comments_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const blocked = await requireFeature(schoolId, 'ai-tools')
  if (blocked) return blocked

  const blockedFeature = await requireFeature(schoolId, 'ai-report-comments')
  if (blockedFeature) return blockedFeature

  const limitBlock = await checkAILimit(schoolId, String(user.id || user.userId || ''))
  if (limitBlock) return limitBlock

  try {
    assertGroqConfigured()
  } catch {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const studentName = String(body?.studentName || '').trim()
  const grade = String(body?.grade || '').trim()
  const subject = String(body?.subject || '').trim()
  const studentId = String(body?.studentId || '').trim() || undefined
  const subjectId = String(body?.subjectId || '').trim() || undefined
  const marks = body?.marks
  const maxMarks = body?.maxMarks
  const behavior = String(body?.behavior || 'Good').trim()
  const attendance = String(body?.attendance || 'Regular').trim()
  const strengths = Array.isArray(body?.strengths) ? body.strengths.map(String).filter(Boolean) : []
  const areasForImprovement = Array.isArray(body?.areasForImprovement)
    ? body.areasForImprovement.map(String).filter(Boolean)
    : []

  if (!studentName || !grade || !subject || marks === undefined || maxMarks === undefined) {
    return NextResponse.json(
      { error: 'studentName, grade, subject, marks, maxMarks required' },
      { status: 400 }
    )
  }

  const guard = validateAIGuardrails({
    text: `${subject} ${grade} school report comment assessment`,
  })
  if (!guard.ok) return guard.response

  const pct = Number(maxMarks) > 0 ? (Number(marks) / Number(maxMarks)) * 100 : 0
  const cachePayload = {
    schoolId,
    studentName,
    grade,
    subject,
    ...(studentId ? { studentId } : {}),
    ...(subjectId ? { subjectId } : {}),
    marks,
    maxMarks,
    behavior,
    attendance,
    strengths,
    areasForImprovement,
  }
  const cached = await getCachedAIResponse('ai-report-comments', cachePayload)
  if (cached?.comment) {
    const stream = aiChain.textToEventStream({
      text: cached.comment,
      provider: cached.generatedBy || 'cache',
      model: cached.model || 'cache',
      plainText: true,
    })
    return new Response(stream, { headers: AI_SSE_HEADERS })
  }

  const prompt = buildReportCommentPrompt({
    subject,
    studentName,
    grade,
    performanceLevel: performanceLevelFromPercentage(pct),
    behavior,
    attendance,
    strengths,
    areasForImprovement,
  })

  const stream = createGroqTextEventStream({
    prompt,
    maxTokens: 500,
    temperature: 0.6,
    plainText: true,
    onErrorMessage: 'Failed to generate comment',
    onComplete: async (responseText) => {
      const cleaned = responseText
      await setCachedAIResponse('ai-report-comments', cachePayload, {
        comment: cleaned,
        generatedBy: 'groq',
      })
      await trackAIUsage(schoolId, 'ai-report-comments')
      await prisma.aIRequest.create({
        data: {
          id: crypto.randomUUID(),
          schoolId,
          feature: 'ai-report-comments',
          prompt: prompt.length > 500 ? prompt.slice(0, 500) : prompt,
          response: cleaned.length > 20000 ? cleaned.slice(0, 20000) : cleaned,
          tokens: 0,
        },
      })
    },
  })

  return new Response(stream, { headers: GROQ_SSE_HEADERS })
})
