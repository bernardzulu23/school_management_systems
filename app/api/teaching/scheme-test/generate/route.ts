/**
 * POST /api/teaching/scheme-test/generate
 * Generate midterm / EoT paper from multi-selected scheme topics (hard ECZ gate).
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { checkAILimit, getSchoolPlanForUsage, trackAIUsage } from '@/lib/middleware/aiUsageTracker'
import { assertGroqConfigured } from '@/lib/ai/groq-client'
import { assertSelectionsEligible, eligibleTopicsForSlot } from '@/lib/teaching/schemeTestTopics'
import { generateSchemeTestPaper } from '@/lib/teaching/generateSchemeTest'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  schemeId: z.string().min(1),
  slot: z.enum(['mid_term', 'end_of_term']),
  selectedWeeks: z.array(z.number().int().positive()).max(20).optional().default([]),
  selectedTopicKeys: z.array(z.string().min(1)).max(20).optional().default([]),
  questionCount: z.number().int().min(1).max(30).optional().default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
})

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

  const blocked = await requireFeature(schoolId, 'ai-quiz-maker')
  if (blocked) return blocked as any

  const limitBlock = await checkAILimit(schoolId, String(user.id || ''))
  if (limitBlock) return limitBlock as any

  try {
    assertGroqConfigured()
  } catch {
    return NextResponse.json(
      { error: 'AI service is not configured (set GROQ_API_KEY or GEMINI_API_KEY)' },
      { status: 503 }
    )
  }

  const body = BodySchema.parse(await request.json().catch(() => null))

  const scheme = await prisma.schemeOfWork.findFirst({
    where: { id: body.schemeId, schoolId },
    include: { testSchedule: true },
  })
  if (!scheme) return NextResponse.json({ error: 'Scheme not found' }, { status: 404 })

  const isOwner = scheme.teacherId === String(user.id)
  const isAdmin = roleCheck(user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const eligible = eligibleTopicsForSlot({
    weeks: scheme.weeks,
    schedule: scheme.testSchedule,
    slot: body.slot,
  })
  if (!eligible.topics.length) {
    return NextResponse.json(
      { error: eligible.warning || 'No eligible topics for this slot' },
      { status: 400 }
    )
  }

  const selection = assertSelectionsEligible(
    eligible.topics,
    body.selectedWeeks || [],
    body.selectedTopicKeys || []
  )
  if (!selection.ok) {
    return NextResponse.json({ error: selection.error }, { status: 400 })
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { level: true },
  })

  const paper = await generateSchemeTestPaper({
    schoolId,
    subject: scheme.subject,
    gradeOrForm: scheme.gradeOrForm,
    schoolLevel: school?.level || 'combined',
    slot: body.slot,
    selectedTopics: selection.selected,
    questionCount: body.questionCount,
    difficulty: body.difficulty,
  })

  await trackAIUsage(schoolId, 'scheme-test-generate').catch(() => {})

  if (!paper.questions.length) {
    return NextResponse.json(
      {
        error:
          'Could not produce ECZ-validated questions for the selected scheme topics. Try fewer topics or adjust the scheme outcomes.',
        rejectedCount: paper.rejectedCount,
        generationId: paper.generationId,
      },
      { status: 422 }
    )
  }

  const plan = await getSchoolPlanForUsage(schoolId)

  return NextResponse.json({
    success: true,
    schemeId: scheme.id,
    slot: body.slot,
    subject: scheme.subject,
    gradeOrForm: scheme.gradeOrForm,
    term: scheme.term,
    year: scheme.year,
    status: scheme.status,
    questions: paper.questions,
    coverage: paper.coverage,
    rejectedCount: paper.rejectedCount,
    assessmentMode: paper.assessmentMode,
    generationId: paper.generationId,
    questionCountRequested: paper.questionCountRequested,
    questionCountReturned: paper.questionCountReturned,
    selectedTopics: selection.selected.map((t) => ({
      week: t.week,
      topicKey: t.topicKey,
      topicTitle: t.topicTitle,
    })),
    plan: plan?.plan || null,
  })
})
