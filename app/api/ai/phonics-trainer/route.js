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
import { generatePhonicsLesson } from '@/lib/ai/zambia-features'

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
    keyPrefix: 'ai_phonics_trainer_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  const blocked = await requireFeature(schoolId, 'phonics-trainer')
  if (blocked) return blocked

  const limitBlock = await checkAILimit(schoolId)
  if (limitBlock) return limitBlock

  const body = await request.json().catch(() => ({}))
  const grade = String(body?.grade || '').trim()
  const phonic = String(body?.phonic || '').trim()

  if (!grade || !phonic) {
    return NextResponse.json({ error: 'grade and phonic required' }, { status: 400 })
  }
  if (!['G1', 'G2', 'G3', 'G4'].includes(grade)) {
    return NextResponse.json({ error: 'Phonics trainer is for Grades 1-4 only' }, { status: 400 })
  }

  const result = await generatePhonicsLesson({ grade, phonic, schoolId })
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to generate phonics lesson' },
      { status: 500 }
    )
  }

  await trackAIUsage(schoolId, 'phonics-trainer')
  return NextResponse.json({ success: true, lesson: result.lesson, tokensUsed: result.tokensUsed })
}
