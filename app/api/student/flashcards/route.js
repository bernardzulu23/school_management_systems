export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  deckDateUtc,
  deckDateKey,
  validateFlashcards,
  MAX_CARDS_PER_DECK,
} from '@/lib/flashcards/limits'
import {
  assertStudentSubjectAllowed,
  resolveStudentGradeLabel,
} from '@/lib/flashcards/studentSubjects'
import { assertCurriculumTopicAllowed } from '@/lib/ai/curriculum-context'
import { runValidationSideBySide } from '@/lib/ecz/eoc/runValidationSideBySide'
import { generateFlashcardDeck } from '@/lib/flashcards/generateDeck'
import { buildRagContextForQuery, appendRagToSystemPrompt } from '@/lib/ai/rag-context'
import { checkAILimit, getSchoolPlanForUsage, trackAIUsage } from '@/lib/middleware/aiUsageTracker'
import { assertGroqConfigured } from '@/lib/ai/client'
import { logger } from '@/lib/utils/logger'
import { parseBodyOrThrow } from '@/lib/middleware/validate-request'
import { GenerateFlashcardsSchema } from '@/lib/schemas'
import { resolveAssessmentMode } from '@/lib/ecz/assessment-engine'

const FLASHCARD_SYSTEM =
  'You are a Zambian CBC study coach. Create concise self-quiz flashcards. Each card has a clear question, 3-4 plausible options, exactly one correct answer, and a one-line explanation. The answer field must be the full text of the correct option (not a letter like A or B). Use the subject language where natural (e.g. Cinyanja for Cinyanja).'

function buildFlashcardPrompt({ subjectName, topic, count, assessmentMode }) {
  const isSecondary = assessmentMode === 'secondary_scenario'
  if (isSecondary) {
    return `Create ${count} ECZ-style recall flashcards for "${subjectName}"${
      topic ? ` on "${topic}"` : ''
    }.
Rules:
- NO multiple choice options — use front/back recall cards (State, Define, Describe command terms).
- Front: question with optional short Zambian context.
- Back (answer field): model answer. Set options to a single-element array matching answer.
- Age-appropriate for Zambian secondary learners.`
  }
  return `Create ${count} multiple-choice study flashcards for the subject "${subjectName}"${
    topic ? ` focused on the topic "${topic}"` : ''
  }.
Rules:
- Exactly ${count} cards (never more than ${MAX_CARDS_PER_DECK}).
- Each card: a question (front), 3-4 options, one correct answer as the full option text (not A/B/C/D), and a short explanation.
- Age-appropriate for Zambian primary/EPSC learners. Use local context where helpful.`
}

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
  const db = getTenantClient(schoolId)

  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: { id: true },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const { searchParams } = new URL(request.url)
  const dateKey = searchParams.get('date') || deckDateKey()

  const day = deckDateUtc(new Date(dateKey))
  const decks = await db.studentFlashcardDeck.findMany({
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
  const db = getTenantClient(schoolId)

  const student = await db.student.findFirst({
    where: { schoolId, userId: auth.user.id },
    select: {
      id: true,
      class: true,
      classRef: { select: { year_group: true } },
    },
  })
  if (!student) throw new ApiError('Student profile not found', 404)

  const body = await parseBodyOrThrow(request, GenerateFlashcardsSchema)
  const subjectName = await assertStudentSubjectAllowed(
    student.id,
    schoolId,
    body.subjectName || body.subject,
    { action: 'create flashcards for' }
  )
  const gradeLevel = resolveStudentGradeLabel(student) || body.gradeLevel || 'Form 1'
  let topic = ''
  try {
    topic = await assertCurriculumTopicAllowed(subjectName, gradeLevel, body.topic, {
      requireIfListed: true,
    })
  } catch (e) {
    throw new ApiError(e?.message || 'Invalid topic for this subject', 400)
  }
  const requestedCount = Number(body.count)
  const count = Math.min(
    MAX_CARDS_PER_DECK,
    Math.max(1, Number.isFinite(requestedCount) ? requestedCount : MAX_CARDS_PER_DECK)
  )
  const day = deckDateUtc(new Date(body.date || deckDateKey()))

  const existing = await db.studentFlashcardDeck.findFirst({
    where: {
      studentId: student.id,
      subjectName,
      deckDate: day,
    },
  })
  if (existing) {
    throw new ApiError(
      `You already have a flashcard deck for ${subjectName} today. One AI deck per subject per day.`,
      409
    )
  }

  // Fail fast with a clear message if the AI provider is not configured.
  try {
    assertGroqConfigured()
  } catch {
    throw new ApiError(
      'AI is not configured on the server (missing GROQ_API_KEY). Contact your administrator.',
      503
    )
  }

  const limitBlock = await checkAILimit(schoolId, String(auth.user?.id || auth.user?.userId || ''))
  if (limitBlock) return limitBlock

  // Generate the flashcards with AI (RAG-grounded on school materials when available).
  const school = await getSchoolPlanForUsage(schoolId)
  let ragBlock = ''
  try {
    const rag = await buildRagContextForQuery({
      query: `${subjectName} ${topic} revision flashcards`,
      schoolId,
      schoolPlan: school?.plan,
      subject: subjectName,
      gradeLevel,
    })
    ragBlock = rag?.block || ''
  } catch (e) {
    // RAG is an optional enhancement — never let it block generation.
    logger.warn?.('flashcards.rag-failed', { message: e?.message })
  }
  const system = ragBlock ? appendRagToSystemPrompt(FLASHCARD_SYSTEM, ragBlock) : FLASHCARD_SYSTEM

  const assessmentMode = resolveAssessmentMode({
    schoolLevel: school?.level,
    gradeLevel,
  })

  let generated
  try {
    generated = await generateFlashcardDeck({
      system,
      userPrompt: buildFlashcardPrompt({
        subjectName,
        topic,
        count,
        assessmentMode,
      }),
      count,
    })
  } catch (e) {
    const msg = String(e?.message || 'AI error')
    logger.error?.('flashcards.generation-failed', e, { schoolId, subjectName })
    const friendly = msg.toLowerCase().includes('rate limit')
      ? 'AI is busy right now — please wait a minute and try again.'
      : msg.toLowerCase().includes('missing groq')
        ? 'AI is not configured on the server. Contact your administrator.'
        : `Could not generate flashcards: ${msg.slice(0, 180)}`
    throw new ApiError(friendly, 503)
  }

  const validated = validateFlashcards(generated?.cards)
  if (!validated.ok) throw new ApiError(validated.error, 502)
  const cards = validated.cards

  const subject = await db.subject.findFirst({
    where: { schoolId, name: { equals: subjectName, mode: 'insensitive' } },
    select: { id: true },
  })

  const deck = await db.studentFlashcardDeck.create({
    data: {
      studentId: student.id,
      schoolId,
      subjectId: subject?.id || body.subjectId || null,
      subjectName,
      deckDate: day,
      title:
        String(generated?.title || '').trim() ||
        (topic ? `${subjectName} — ${topic}` : `${subjectName} — ${deckDateKey(day)}`),
      cards,
    },
  })

  await trackAIUsage(schoolId, 'student-flashcards').catch(() => {})

  void runValidationSideBySide({
    schoolId,
    source: 'flashcards',
    subject: subjectName,
    topicTag: topic || subjectName,
    formLevel: gradeLevel,
    assessmentMode,
    items: cards.map((card, i) => ({
      kind: 'practice_question',
      question: {
        id: `flashcard-${i + 1}`,
        type: 'mcq',
        question: String(card?.front || card?.question || ''),
        marks: 1,
        explanation: String(card?.explanation || ''),
      },
    })),
  }).catch(() => {})

  return NextResponse.json(
    {
      success: true,
      data: {
        id: deck.id,
        subjectName: deck.subjectName,
        title: deck.title,
        cardCount: cards.length,
        cards: deck.cards,
      },
    },
    { status: 201 }
  )
})
