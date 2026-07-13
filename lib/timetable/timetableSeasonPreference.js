/**
 * Shared HT/timetable season preference (term + academic year).
 * Keeps dashboard overview and Master Timetable Edit on the same season.
 */

export const TIMETABLE_SEASON_STORAGE_KEY = 'zsms-timetable-season-v1'

export function readStoredTimetableSeason() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TIMETABLE_SEASON_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const term = String(parsed?.term || '').trim()
    const academicYear = String(parsed?.academicYear || '').trim()
    if (!term || !academicYear) return null
    return { term, academicYear }
  } catch {
    return null
  }
}

export function writeStoredTimetableSeason(term, academicYear) {
  if (typeof window === 'undefined') return
  const t = String(term || '').trim()
  const y = String(academicYear || '').trim()
  if (!t || !y) return
  try {
    window.localStorage.setItem(
      TIMETABLE_SEASON_STORAGE_KEY,
      JSON.stringify({ term: t, academicYear: y, at: new Date().toISOString() })
    )
  } catch {
    /* quota / private mode */
  }
}
