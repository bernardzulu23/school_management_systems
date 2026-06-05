import { scoreQuestion } from '@/lib/assessment/auto-scorer'

const QUIZ_PAYLOAD_VERSION = 'interactive_quiz_v1'

export function buildInteractiveQuizPayload(quiz, meta = {}) {
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return null
  return {
    version: QUIZ_PAYLOAD_VERSION,
    quiz,
    meta: {
      publishedAt: new Date().toISOString(),
      ...meta,
    },
  }
}

export function serializeInteractiveQuizPayload(payload) {
  if (!payload) return ''
  return JSON.stringify(payload)
}

export function parseInteractiveQuizPayload(rawDescription) {
  const raw = String(rawDescription || '').trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version !== QUIZ_PAYLOAD_VERSION) return null
    if (!parsed?.quiz || !Array.isArray(parsed.quiz?.questions)) return null
    return parsed
  } catch {
    return null
  }
}

/** Strip leading option labels like "A." or "B)" from option text. */
export function stripOptionLabel(text) {
  return String(text || '')
    .replace(/^[A-Ea-e][.)]\s*/, '')
    .trim()
}

export function inferQuestionType(question) {
  const explicit = String(question?.type || '').toLowerCase()
  if (['mcq', 'short', 'true_false', 'structured'].includes(explicit)) return explicit
  const options = Array.isArray(question?.options) ? question.options : []
  if (options.length >= 2) return 'mcq'
  if (options.length === 2 && options.every((o) => /^(true|false)$/i.test(String(o)))) {
    return 'true_false'
  }
  return 'short'
}

export function normalizeQuestion(question, index = 0) {
  const options = Array.isArray(question?.options)
    ? question.options.map((o) => String(o)).filter(Boolean)
    : []
  const type = inferQuestionType({ ...question, options })
  return {
    id: String(question?.id || `q_${index + 1}`),
    type,
    question: String(question?.question || '').trim(),
    options,
    answer: String(question?.answer || '').trim(),
    explanation: String(question?.explanation || '').trim(),
    marks: Number.isFinite(Number(question?.marks)) ? Number(question.marks) : 1,
  }
}

/** Remove answers/explanations before a student submits an attempt. */
export function sanitizeQuizForStudent(quiz) {
  if (!quiz || typeof quiz !== 'object') return quiz
  const questions = Array.isArray(quiz.questions) ? quiz.questions : []
  return {
    title: quiz.title,
    subject: quiz.subject,
    grade: quiz.grade,
    topic: quiz.topic,
    totalMarks: quiz.totalMarks,
    durationMinutes: quiz.durationMinutes,
    questions: questions.map((q, idx) => {
      const normalized = normalizeQuestion(q, idx)
      const base = {
        id: normalized.id,
        type: normalized.type,
        question: normalized.question,
        marks: normalized.marks,
      }
      if (normalized.type === 'mcq' || normalized.type === 'true_false') {
        return {
          ...base,
          options: normalized.options.map((opt) => stripOptionLabel(opt)),
        }
      }
      return base
    }),
  }
}

export function gradeQuizAttempt(quiz, answers = {}) {
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : []
  let score = 0
  let totalMarks = 0
  let needsReview = false
  const review = questions.map((q, idx) => {
    const normalized = normalizeQuestion(q, idx)
    const selected = String(answers?.[normalized.id] || '').trim()
    const result = scoreQuestion(normalized, selected)
    totalMarks += result.maxMarks
    score += result.awarded
    if (result.needsReview) needsReview = true
    const isCorrect = result.awarded >= result.maxMarks && result.maxMarks > 0
    return {
      id: normalized.id,
      type: normalized.type,
      question: normalized.question,
      selected,
      correct: normalized.answer,
      isCorrect,
      awarded: result.awarded,
      marks: result.maxMarks,
      needsReview: result.needsReview,
      reason: result.reason,
      explanation: normalized.explanation,
    }
  })

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0
  const encouragement =
    percentage >= 85
      ? 'Excellent work! Keep this momentum.'
      : percentage >= 65
        ? 'Good effort. You are progressing well.'
        : 'Keep practicing. You can improve with another revision round.'

  return { score, totalMarks, percentage, review, encouragement, needsReview }
}
