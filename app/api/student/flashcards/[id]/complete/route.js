export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { scoreFlashcardSession } from '@/lib/flashcards/scoreSession'
import { generateFlashcardSessionFeedback } from '@/lib/flashcards/generateSessionFeedback'
import { checkAILimit, trackAIUsage } from '@/lib/middleware/aiUsageTracker'

const CompleteSchema = z.object({
  answers: z.record(z.string(), z.string()).default({}),
})

export const POST = withErrorHandler(async function POST(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { id } = await params
  const deckId = String(id || '').trim()
  if (!deckId) throw new ApiError('Deck id required', 400)

  const db = getTenantClient(schoolId)
  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const deck = await db.studentFlashcardDeck.findFirst({
    where: { id: deckId, schoolId, studentId: student.id },
  })
  if (!deck) throw new ApiError('Deck not found', 404)

  const body = await parseBodyOrThrow(request, CompleteSchema)
  const cards = Array.isArray(deck.cards) ? deck.cards : []
  if (!cards.length) throw new ApiError('Deck has no cards', 400)

  const unanswered = cards.filter((c) => !String(body.answers[c.id] || '').trim())
  if (unanswered.length > 0) {
    throw new ApiError('Answer every question before finishing the deck', 400)
  }

  const score = scoreFlashcardSession(cards, body.answers)

  const limitBlock = await checkAILimit(schoolId, String(auth.user?.id || ''))
  if (limitBlock) return limitBlock

  const feedback = await generateFlashcardSessionFeedback({
    subjectName: deck.subjectName,
    deckTitle: deck.title,
    score,
  })

  await trackAIUsage(schoolId, 'student-flashcards-feedback').catch(() => {})

  return NextResponse.json({
    success: true,
    data: {
      deckId: deck.id,
      subjectName: deck.subjectName,
      title: deck.title,
      score: {
        correct: score.correctCount,
        total: score.total,
        percent: score.percent,
        rating: score.rating,
      },
      results: score.results,
      feedback,
    },
  })
})
