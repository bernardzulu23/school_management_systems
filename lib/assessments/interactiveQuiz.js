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

export function normalizeQuestion(question, index = 0) {
  const options = Array.isArray(question?.options)
    ? question.options.map((o) => String(o)).filter(Boolean)
    : []
  return {
    id: String(question?.id || `q_${index + 1}`),
    question: String(question?.question || '').trim(),
    options,
    answer: String(question?.answer || '').trim(),
    explanation: String(question?.explanation || '').trim(),
    marks: Number.isFinite(Number(question?.marks)) ? Number(question.marks) : 1,
  }
}

export function gradeQuizAttempt(quiz, answers = {}) {
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : []
  let score = 0
  let totalMarks = 0
  const review = questions.map((q, idx) => {
    const normalized = normalizeQuestion(q, idx)
    const selected = String(answers?.[normalized.id] || '').trim()
    const correct = normalized.answer
    const isCorrect = Boolean(selected) && selected.toLowerCase() === correct.toLowerCase()
    totalMarks += normalized.marks
    if (isCorrect) score += normalized.marks
    return {
      id: normalized.id,
      selected,
      correct,
      isCorrect,
      marks: normalized.marks,
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

  return { score, totalMarks, percentage, review, encouragement }
}
