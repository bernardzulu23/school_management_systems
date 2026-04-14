import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { checkMonthlyAIQuota, getPerMinuteLimit } from '@/lib/ai/aiAccess'
import { generateQuiz } from '@/lib/ai/zambia-features'

export async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'HOD', 'ADMIN'])) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const schoolId = String(user.schoolId || '').trim()
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const quota = await checkMonthlyAIQuota(schoolId)
  const perMinuteLimit = getPerMinuteLimit(quota?.plan)
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? perMinuteLimit : perMinuteLimit * 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai_quiz_maker_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  if (quota?.exceeded) {
    return NextResponse.json(
      { error: 'Monthly AI quota exceeded', code: 'AI_QUOTA_EXCEEDED', plan: quota.plan },
      { status: 429 }
    )
  }

  const blocked = await requireFeature(schoolId, 'ai-quiz-maker')
  if (blocked) return blocked

  const body = await request.json().catch(() => ({}))
  const grade = String(body?.grade || '').trim()
  const subject = String(body?.subject || '').trim()
  const topic = String(body?.topic || '').trim()
  const questionCount = Number(body?.questionCount ?? 10)

  if (!grade || !subject || !topic) {
    return NextResponse.json({ error: 'grade, subject, topic required' }, { status: 400 })
  }

  const count =
    Number.isFinite(questionCount) && questionCount > 0 ? Math.min(30, questionCount) : 10
  const result = await generateQuiz({ grade, subject, topic, questionCount: count, schoolId })
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to generate quiz' }, { status: 500 })
  }

  return NextResponse.json({ success: true, quiz: result.quiz, tokensUsed: result.tokensUsed })
}
