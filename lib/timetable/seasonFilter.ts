import type { Assignment } from '@/lib/timetable/types'

/** UI season selector values on headteacher timetable. */
export type TimetableUiSeason = 'normal' | 'planting' | 'farming'

/** Collision detector / DragDrop season values. */
export type TimetableDetectorSeason = 'normal' | 'planting' | 'harvest'

/** DB-backed entries currently use `normal` until seasonal timetables are persisted. */
export function filterAssignmentsForUiSeason(
  assignments: Assignment[],
  uiSeason: TimetableUiSeason
): Assignment[] {
  const list = Array.isArray(assignments) ? assignments : []
  if (uiSeason === 'normal') {
    return list.filter((a) => !a.season || a.season === 'normal')
  }
  const matched = list.filter((a) => a.season === uiSeason)
  if (matched.length > 0) return matched
  return list.filter((a) => !a.season || a.season === 'normal')
}

export function uiSeasonToDetectorSeason(uiSeason: TimetableUiSeason): TimetableDetectorSeason {
  if (uiSeason === 'farming') return 'harvest'
  if (uiSeason === 'planting') return 'planting'
  return 'normal'
}
