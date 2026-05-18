export const TIMETABLE_TERMS = ['Term 1', 'Term 2', 'Term 3']

export function getDefaultAcademicYear() {
  return String(new Date().getFullYear())
}

export function getDefaultTerm() {
  return 'Term 1'
}

/** Recent years for selectors (current ± 1). */
export function getAcademicYearOptions() {
  const y = new Date().getFullYear()
  return [String(y - 1), String(y), String(y + 1)]
}
