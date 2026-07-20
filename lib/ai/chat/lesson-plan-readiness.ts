/**
 * Syllabus Readiness Index helpers for chat LessonPlanSubmission dashboards (Phase 4).
 *
 * Required count: no term/curriculum requirement model is wired to LessonPlanSubmission yet.
 * Use LESSON_PLAN_REQUIRED_PER_TERM (env) until real term syllabus targets are connected.
 * Do not invent fake syllabus completeness from static fallback files.
 */

/** Default when env is unset — pilot placeholder, not a real syllabus target. */
export const DEFAULT_LESSON_PLAN_REQUIRED_PER_TERM = 12

export function getRequiredLessonPlansPerTerm(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.LESSON_PLAN_REQUIRED_PER_TERM
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return Math.floor(n)
  return DEFAULT_LESSON_PLAN_REQUIRED_PER_TERM
}

export type SubmissionStatusCounts = {
  DRAFT: number
  PENDING_APPROVAL: number
  APPROVED: number
  REJECTED: number
}

const EMPTY_COUNTS: SubmissionStatusCounts = {
  DRAFT: 0,
  PENDING_APPROVAL: 0,
  APPROVED: 0,
  REJECTED: 0,
}

/** Normalize Prisma groupBy rows into a fixed status map. */
export function countsFromGroupBy(
  rows: Array<{ status: string; _count: number | { _all?: number } }>
): SubmissionStatusCounts {
  const out: SubmissionStatusCounts = { ...EMPTY_COUNTS }
  for (const row of rows) {
    const key = String(row.status || '').toUpperCase() as keyof SubmissionStatusCounts
    if (!(key in out)) continue
    const c = row._count
    out[key] = typeof c === 'number' ? c : Number(c?._all || 0)
  }
  return out
}

export function totalFromCounts(counts: SubmissionStatusCounts): number {
  return counts.DRAFT + counts.PENDING_APPROVAL + counts.APPROVED + counts.REJECTED
}

/**
 * Syllabus Readiness Index = approved / required (capped display at 100%).
 * Returns ratio 0–1+ (may exceed 1 if over-required) and percent clamped to 100 for UI bars.
 */
export function syllabusReadinessIndex(
  approvedCount: number,
  requiredCount: number = getRequiredLessonPlansPerTerm()
): {
  approvedCount: number
  requiredCount: number
  ratio: number
  percent: number
} {
  const approved = Math.max(0, Number(approvedCount) || 0)
  const required = Math.max(1, Number(requiredCount) || getRequiredLessonPlansPerTerm())
  const ratio = approved / required
  const percent = Math.min(100, Math.round(ratio * 100))
  return { approvedCount: approved, requiredCount: required, ratio, percent }
}
