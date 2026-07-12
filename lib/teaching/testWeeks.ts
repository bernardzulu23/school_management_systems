/**
 * Mid-term / end-of-term test weeks are assessment-only (not teaching).
 */

export type WeekKind = 'teaching' | 'mid_term_test' | 'end_of_term_test'

export type TestScheduleLike = {
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
  return new Set([...midTermWeeksFromSchedule(schedule), ...endOfTermWeeksFromSchedule(schedule)])
}

export function classifyWeek(
  week: number,
  schedule: TestScheduleLike | null | undefined
): WeekKind {
  const w = Number(week)
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
  if (t === 'mid_term_test' || t === 'mid-term' || t === 'midterm') return 'mid_term_test'
  if (t === 'end_of_term_test' || t === 'end-of-term' || t === 'eot') return 'end_of_term_test'
  if (t === 'teaching') return 'teaching'
  return classifyWeek(week, schedule)
}

export function testWeekTopicLabel(kind: WeekKind): string {
  if (kind === 'mid_term_test') return 'Mid-term assessment'
  if (kind === 'end_of_term_test') return 'End-of-term examinations'
  return ''
}

export function testWeekRemarks(kind: WeekKind): string {
  if (kind === 'mid_term_test') return 'Mid-term test week — no teaching expected'
  if (kind === 'end_of_term_test') return 'End-of-term examinations — no teaching expected'
  return ''
}
