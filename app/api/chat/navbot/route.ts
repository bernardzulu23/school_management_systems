import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { enforceNavBotRateLimit } from '@/lib/navbot/enforce-rate-limit'
import { matchIntent } from '@/lib/navbot/match-intent'

export const dynamic = 'force-dynamic'

export const NAVBOT_FALLBACK_MESSAGE =
  'I can help you find your way around ZSMS — things like your timetable, results, or attendance. For subject questions, please ask your teacher or try Study Assistant.'

const BodySchema = z.object({
  message: z.string().min(1).max(1000),
})

export async function POST(request: Request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['STUDENT'])) {
    return NextResponse.json({ error: 'Forbidden', code: 'NAVBOT_STUDENT_ONLY' }, { status: 403 })
  }

  const schoolId = String(auth.user.schoolId || '')
  const db = getTenantClient(schoolId)
  const student = await db.student.findFirst({
    where: {
      userId: String(auth.user.id),
      schoolId,
    },
    select: { id: true },
  })

  if (!student) {
    return NextResponse.json(
      { error: 'Student profile not found', code: 'STUDENT_PROFILE_NOT_FOUND' },
      { status: 404 }
    )
  }

  const rateLimit = await enforceNavBotRateLimit(student.id)
  if (rateLimit.limited) return rateLimit.response

  const raw = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const message = parsed.data.message.trim()
  const result = matchIntent(message)
  const matchedIntentId = result.match?.intent.id ?? null

  await db.navBotQuery.create({
    data: {
      schoolId,
      studentId: student.id,
      question: message,
      matchedIntentId,
    },
  })

  if (result.match) {
    return NextResponse.json({
      matched: true,
      intentId: result.match.intent.id,
      answer: result.match.intent.answer,
      route: result.match.intent.route,
      score: result.match.score,
    })
  }

  return NextResponse.json({
    matched: false,
    intentId: null,
    answer: NAVBOT_FALLBACK_MESSAGE,
    route: null,
    score: result.bestCandidate?.score ?? 0,
  })
}
