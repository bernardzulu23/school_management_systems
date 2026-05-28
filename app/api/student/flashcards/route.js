export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  deckDateUtc,
  deckDateKey,
  validateFlashcards,
  MAX_CARDS_PER_DECK,
} from '@/lib/flashcards/limits'
import { assertStudentSubjectAllowed } from '@/lib/flashcards/studentSubjects'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const student = await prisma.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const { searchParams } = new URL(request.url)
  const dateKey = searchParams.get('date') || deckDateKey()

  const day = deckDateUtc(new Date(dateKey))
  const decks = await prisma.studentFlashcardDeck.findMany({
    where: { schoolId, studentId: student.id, deckDate: day },
    orderBy: { subjectName: 'asc' },
  })

  return NextResponse.json({
    success: true,
    data: {
      date: dateKey,
      maxCardsPerDeck: MAX_CARDS_PER_DECK,
      decks: decks.map((d) => ({
        id: d.id,
        subjectName: d.subjectName,
        subjectId: d.subjectId,
        title: d.title,
        cardCount: Array.isArray(d.cards) ? d.cards.length : 0,
        cards: d.cards,
        createdAt: d.createdAt,
      })),
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const student = await prisma.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const body = await request.json().catch(() => ({}))
  const subjectName = await assertStudentSubjectAllowed(
    student.id,
    schoolId,
    body.subjectName || body.subject
  )
  const day = deckDateUtc(new Date(body.date || deckDateKey()))

  const existing = await prisma.studentFlashcardDeck.findFirst({
    where: {
      studentId: student.id,
      subjectName,
      deckDate: day,
    },
  })
  if (existing) {
    throw new ApiError(
      `You already created a flashcard deck for ${subjectName} today. One deck per subject per day.`,
      409
    )
  }

  const validated = validateFlashcards(body.cards)
  if (!validated.ok) throw new ApiError(validated.error, 400)
  const cards = validated.cards

  const subject = await prisma.subject.findFirst({
    where: { schoolId, name: { equals: subjectName, mode: 'insensitive' } },
    select: { id: true },
  })

  const deck = await prisma.studentFlashcardDeck.create({
    data: {
      studentId: student.id,
      schoolId,
      subjectId: subject?.id || body.subjectId || null,
      subjectName,
      deckDate: day,
      title: body.title ? String(body.title).trim() : `${subjectName} — ${deckDateKey(day)}`,
      cards,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: deck.id,
        subjectName: deck.subjectName,
        cardCount: cards.length,
        cards: deck.cards,
      },
    },
    { status: 201 }
  )
})
