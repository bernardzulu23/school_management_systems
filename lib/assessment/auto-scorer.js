/**
 * Auto-scoring for ECZ-style mock examination answers.
 *
 * AUTO-SCORED: calculations (numeric tolerance), MCQ, definitions (keyword overlap),
 * exact short answers.
 *
 * TEACHER REVIEW: Explain/Evaluate/Analyse/structured essays — flagged with
 * partial credit placeholder until a teacher confirms.
 */

const REVIEW_PATTERN =
  /\b(explain|evaluate|analyse|analyze|discuss|justify|assess|compare|contrast)\b/i

export function normalizeAnswer(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function extractNumbers(text) {
  const matches = String(text || '').match(/-?\d+\.?\d*/g)
  return matches ? matches.map(Number) : []
}

function keywordOverlapRatio(student, expected) {
  const keywords = expected.split(/\W+/).filter((w) => w.length > 3)
  if (keywords.length < 2) return 0
  const hits = keywords.filter((k) => student.includes(k))
  return hits.length / keywords.length
}

function numericMatch(studentNums, expectedNums) {
  if (!expectedNums.length || studentNums.length < expectedNums.length) return false
  return expectedNums.every((exp, i) => {
    const got = studentNums[i]
    if (got === undefined) return false
    if (exp === 0) return Math.abs(got) < 0.01
    return Math.abs(got - exp) / Math.abs(exp) <= 0.01 || Math.abs(got - exp) <= 0.01
  })
}

/**
 * Score a single question against the model answer.
 * @returns {{ awarded: number, maxMarks: number, needsReview: boolean, reason: string }}
 */
export function scoreQuestion(question, studentAnswer) {
  const maxMarks = Number(question?.marks) || 1
  const answer = normalizeAnswer(studentAnswer)
  const expected = normalizeAnswer(question?.answer)

  if (!answer) {
    return { awarded: 0, maxMarks, needsReview: false, reason: 'empty' }
  }

  const qText = String(question?.question || '')
  const type = String(question?.type || 'short')

  if (type === 'mcq' && Array.isArray(question?.options) && question.options.length) {
    if (answer === expected) {
      return { awarded: maxMarks, maxMarks, needsReview: false, reason: 'mcq_exact' }
    }
    const idx = question.options.findIndex((o) => normalizeAnswer(o) === answer)
    if (idx >= 0) {
      const letter = String.fromCharCode(65 + idx).toLowerCase()
      if (expected === letter || expected === normalizeAnswer(question.options[idx])) {
        return { awarded: maxMarks, maxMarks, needsReview: false, reason: 'mcq_option' }
      }
    }
    return { awarded: 0, maxMarks, needsReview: false, reason: 'mcq_wrong' }
  }

  const studentNums = extractNumbers(answer)
  const expectedNums = extractNumbers(expected)
  if (expectedNums.length && numericMatch(studentNums, expectedNums)) {
    return { awarded: maxMarks, maxMarks, needsReview: false, reason: 'numeric' }
  }

  if (answer === expected) {
    return { awarded: maxMarks, maxMarks, needsReview: false, reason: 'exact' }
  }

  const overlap = keywordOverlapRatio(answer, expected)
  if (overlap >= 0.65) {
    return {
      awarded: Math.round(maxMarks * overlap),
      maxMarks,
      needsReview: false,
      reason: 'keyword',
    }
  }

  const openEnded =
    type === 'structured' ||
    REVIEW_PATTERN.test(qText) ||
    expected.length > 100 ||
    (expected.split(/\W+/).length > 12 && overlap < 0.4)

  if (openEnded) {
    const partial = overlap >= 0.25 ? Math.round(maxMarks * 0.25) : 0
    return { awarded: partial, maxMarks, needsReview: true, reason: 'review' }
  }

  if (overlap >= 0.35) {
    return {
      awarded: Math.round(maxMarks * overlap),
      maxMarks,
      needsReview: false,
      reason: 'partial_keyword',
    }
  }

  return { awarded: 0, maxMarks, needsReview: false, reason: 'incorrect' }
}

/**
 * Score an entire mock exam paper.
 * @param {{ questions?: Array<Record<string, unknown>> }} paper
 * @param {Record<string, string>} answers keyed by question id
 */
export function scoreMockExam(paper, answers = {}) {
  const questions = Array.isArray(paper?.questions) ? paper.questions : []
  const breakdown = []
  let totalMarks = 0
  let awardedMarks = 0
  let needsReview = false

  for (const q of questions) {
    const qid = String(q?.id || '')
    const studentAnswer = answers[qid] ?? answers[q?.id] ?? ''
    const result = scoreQuestion(q, studentAnswer)
    totalMarks += result.maxMarks
    awardedMarks += result.awarded
    if (result.needsReview) needsReview = true
    breakdown.push({
      questionId: qid,
      awarded: result.awarded,
      maxMarks: result.maxMarks,
      needsReview: result.needsReview,
      reason: result.reason,
    })
  }

  const percentage = totalMarks > 0 ? Math.round((awardedMarks / totalMarks) * 1000) / 10 : 0
  const scoreBucket = Math.min(90, Math.floor(percentage / 10) * 10)

  return {
    totalMarks,
    awardedMarks,
    percentage,
    scoreBucket,
    needsReview,
    breakdown,
    status: needsReview ? 'needs_review' : 'graded',
  }
}
