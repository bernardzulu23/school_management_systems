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
import { analyzeCBCCompetencies } from '@/lib/ai/zambia-features'

export async function POST(request) {
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
    keyPrefix: 'ai_competency_analyzer_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const blocked = await requireFeature(schoolId, 'cbc-competency-tracker')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId)
  if (limitBlock) return limitBlock

  const body = await request.json().catch(() => ({}))
  const studentName = String(body?.studentName || '').trim()
  const grade = String(body?.grade || '').trim()
  const observations = Array.isArray(body?.observations) ? body.observations : null

  if (!studentName || !grade || !observations || observations.length === 0) {
    return NextResponse.json(
      { error: 'studentName, grade, and observations required' },
      { status: 400 }
    )
  }

  const result = await analyzeCBCCompetencies({ studentName, grade, observations, schoolId })
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to analyze competencies' },
      { status: 500 }
    )
  }

  await trackAIUsage(schoolId, 'cbc-competency-tracker')
  return NextResponse.json({
    success: true,
    analysis: result.analysis,
    tokensUsed: result.tokensUsed,
  })
}
