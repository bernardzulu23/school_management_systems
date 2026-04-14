import { NextResponse } from 'next/server'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { checkMonthlyAIQuota, getPerMinuteLimit } from '@/lib/ai/aiAccess'
import { generateReportComments } from '@/lib/ai/zambia-features'

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
    keyPrefix: 'ai_report_comments_',
    keyGenerator: ({ ip }) => `${ip}-${schoolId}-${String(user.id || '')}`,
  })
  if (rl.isLimited) return rl.response

  if (quota?.exceeded) {
    return NextResponse.json(
      { error: 'Monthly AI quota exceeded', code: 'AI_QUOTA_EXCEEDED', plan: quota.plan },
      { status: 429 }
    )
  }

  const blocked = await requireFeature(schoolId, 'ai-report-comments')
  if (blocked) return blocked

  const body = await request.json().catch(() => ({}))
  const studentName = String(body?.studentName || '').trim()
  const grade = String(body?.grade || '').trim()
  const subject = String(body?.subject || '').trim()
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

  const result = await generateReportComments({
    studentName,
    grade,
    subject,
    marks,
    maxMarks,
    behavior,
    attendance,
    strengths,
    areasForImprovement,
    schoolId,
  })

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to generate comment' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    comment: result.comment,
    tokensUsed: result.tokensUsed,
  })
}
