/**
 * Mock examination helpers — paper sanitization, percentile math.
 */

/** Strip model answers from a paper while a student is still sitting the exam. */
export function sanitizePaperForStudent(paper) {
  if (!paper || typeof paper !== 'object') return paper
  const questions = Array.isArray(paper.questions) ? paper.questions : []
  return {
    ...paper,
    examInfo: paper.examInfo || null,
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      marks: q.marks,
    })),
  }
}

/** Attach explanations and model answers after submission. */
export function paperWithResults(paper, breakdown = []) {
  const byId = new Map(breakdown.map((b) => [String(b.questionId), b]))
  const questions = Array.isArray(paper?.questions) ? paper.questions : []
  return {
    ...paper,
    questions: questions.map((q) => ({
      ...q,
      scoring: byId.get(String(q.id)) || null,
    })),
  }
}

/**
 * Compute national percentile from an ordered list of peer percentages.
 * @param {number} studentPercentage
 * @param {number[]} peerPercentages all submitted scores nationally (anonymised)
 */
export function computePercentile(studentPercentage, peerPercentages) {
  const peers = (peerPercentages || []).filter((n) => Number.isFinite(n))
  if (!peers.length) {
    return { percentile: null, rankMessage: 'Not enough national data yet — keep practising!' }
  }
  const below = peers.filter((p) => p < studentPercentage).length
  const equal = peers.filter((p) => p === studentPercentage).length
  const percentile = Math.round(((below + equal * 0.5) / peers.length) * 100)
  const topPct = Math.max(1, 100 - percentile)
  return {
    percentile,
    sampleSize: peers.length,
    rankMessage:
      percentile >= 50
        ? `You scored in the top ${topPct}% nationally (${peers.length} mock exams compared).`
        : `You scored better than ${percentile}% of students nationally (${peers.length} mock exams compared).`,
  }
}

/** Bucket percentages into 0,10,...,90 for anonymous distribution charts. */
export function buildScoreDistribution(percentages) {
  const dist = {}
  for (let b = 0; b <= 90; b += 10) {
    dist[`${b}-${b + 10}`] = 0
  }
  for (const p of percentages || []) {
    if (!Number.isFinite(p)) continue
    const bucket = Math.min(90, Math.floor(p / 10) * 10)
    const key = `${bucket}-${bucket + 10}`
    dist[key] = (dist[key] || 0) + 1
  }
  return dist
}

export function toAttemptSummary(row) {
  return {
    id: row.id,
    subject: row.subject,
    examLevel: row.examLevel,
    topic: row.topic,
    durationMinutes: row.durationMinutes,
    totalMarks: row.totalMarks,
    awardedMarks: row.awardedMarks,
    percentage: row.percentage,
    needsReview: row.needsReview,
    status: row.status,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    gradedAt: row.gradedAt,
  }
}
