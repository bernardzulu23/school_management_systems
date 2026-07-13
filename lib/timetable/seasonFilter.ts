import type { Assignment } from '@/lib/timetable/types'

/** UI season selector values on headteacher timetable. */
export type TimetableUiSeason = 'normal' | 'planting' | 'farming'

/** Collision detector / DragDrop season values. */
export type TimetableDetectorSeason = 'normal' | 'planting' | 'harvest'

/** Normalize store/API season strings (`harvest` ↔ `farming`) to UI season. */
export function toUiSeason(season: string | null | undefined): TimetableUiSeason {
  const s = String(season || 'normal')
    .trim()
    .toLowerCase()
  if (s === 'farming' || s === 'harvest') return 'farming'
  if (s === 'planting') return 'planting'
  return 'normal'
}

/** DB-backed entries currently use `normal` until seasonal timetables are persisted. */
export function filterAssignmentsForUiSeason(
  assignments: Assignment[],
  uiSeason: TimetableUiSeason | string
): Assignment[] {
  const season = toUiSeason(uiSeason)
  const list = Array.isArray(assignments) ? assignments : []
  if (season === 'normal') {
    return list.filter((a) => !a.season || a.season === 'normal')
  }
  const matched = list.filter((a) => a.season === season)
  if (matched.length > 0) return matched
  return list.filter((a) => !a.season || a.season === 'normal')
}

export function uiSeasonToDetectorSeason(
  uiSeason: TimetableUiSeason | string
): TimetableDetectorSeason {
  const season = toUiSeason(uiSeason)
  if (season === 'farming') return 'harvest'
  if (season === 'planting') return 'planting'
  return 'normal'
}
