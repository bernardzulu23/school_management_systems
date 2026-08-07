/**
 * Mid-term / end-of-term / week-2 test weeks are assessment-only (not teaching).
 * Primary schools typically assess in week 2, week 7, and end of term.
 */

export type WeekKind = 'teaching' | 'week2_test' | 'mid_term_test' | 'end_of_term_test'

export type TestScheduleLike = {
  /** Primary formative / early assessment (default week 2). */
  week2AssessmentWeek?: number | null
  week2AssessmentWeekEnd?: number | null
  midTermWeek?: number | null
  midTermWeekEnd?: number | null
  endOfTermWeek?: number | null
  endOfTermWeekEnd?: number | null
}

/** Inclusive week numbers from start..end (end defaults to start). */
export function expandWeekRange(
  start: number | null | undefined,
  end?: number | null | undefined
): number[] {
  const s = Number(start)
  if (!Number.isFinite(s) || s < 1) return []
  const eRaw = end != null && Number.isFinite(Number(end)) ? Number(end) : s
  const lo = Math.min(s, eRaw)
  const hi = Math.max(s, eRaw)
  const out: number[] = []
  for (let w = lo; w <= hi; w++) out.push(w)
  return out
}

export function week2AssessmentWeeksFromSchedule(
  schedule: TestScheduleLike | null | undefined
): number[] {
  if (!schedule) return []
  return expandWeekRange(schedule.week2AssessmentWeek, schedule.week2AssessmentWeekEnd)
}

export function midTermWeeksFromSchedule(schedule: TestScheduleLike | null | undefined): number[] {
  if (!schedule) return []
  return expandWeekRange(schedule.midTermWeek, schedule.midTermWeekEnd)
}

export function endOfTermWeeksFromSchedule(
  schedule: TestScheduleLike | null | undefined
): number[] {
  if (!schedule) return []
  return expandWeekRange(schedule.endOfTermWeek, schedule.endOfTermWeekEnd)
}

export function testWeekSetFromSchedule(
  schedule: TestScheduleLike | null | undefined
): Set<number> {
  return new Set([
    ...week2AssessmentWeeksFromSchedule(schedule),
    ...midTermWeeksFromSchedule(schedule),
    ...endOfTermWeeksFromSchedule(schedule),
  ])
}

/**
 * Primary/combined default: week 2 assessment, week 7 mid-term, EOT at term end.
 */
export function primaryDefaultTestSchedule(weekCount = 12): TestScheduleLike {
  const weeks = Math.max(8, Math.min(20, Number(weekCount) || 12))
  return {
    week2AssessmentWeek: 2,
    week2AssessmentWeekEnd: 2,
    midTermWeek: 7,
    midTermWeekEnd: 7,
    endOfTermWeek: weeks,
    endOfTermWeekEnd: weeks,
  }
}

export function classifyWeek(
  week: number,
  schedule: TestScheduleLike | null | undefined
): WeekKind {
  const w = Number(week)
  if (week2AssessmentWeeksFromSchedule(schedule).includes(w)) return 'week2_test'
  if (midTermWeeksFromSchedule(schedule).includes(w)) return 'mid_term_test'
  if (endOfTermWeeksFromSchedule(schedule).includes(w)) return 'end_of_term_test'
  return 'teaching'
}

export function isTestWeek(week: number, schedule: TestScheduleLike | null | undefined): boolean {
  return classifyWeek(week, schedule) !== 'teaching'
}

/** Prefer weekType on the row; fall back to schedule classification. */
export function weekKindFromRow(
  week: number,
  weekType: string | null | undefined,
  schedule: TestScheduleLike | null | undefined
): WeekKind {
  const t = String(weekType || '').toLowerCase()
  if (t === 'week2_test' || t === 'week_2' || t === 'week2' || t === 'week-2') return 'week2_test'
  if (t === 'mid_term_test' || t === 'mid-term' || t === 'midterm') return 'mid_term_test'
  if (t === 'end_of_term_test' || t === 'end-of-term' || t === 'eot') return 'end_of_term_test'
  if (t === 'teaching') return 'teaching'
  return classifyWeek(week, schedule)
}

export function testWeekTopicLabel(kind: WeekKind): string {
  if (kind === 'week2_test') return 'Week 2 assessment'
  if (kind === 'mid_term_test') return 'Week 7 / mid-term assessment'
  if (kind === 'end_of_term_test') return 'End-of-term examinations'
  return ''
}

export function testWeekRemarks(kind: WeekKind): string {
  if (kind === 'week2_test') return 'Week 2 assessment — no new teaching expected'
  if (kind === 'mid_term_test') return 'Mid-term test week — no teaching expected'
  if (kind === 'end_of_term_test') return 'End-of-term examinations — no teaching expected'
  return ''
}
