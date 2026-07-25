/**
 * Pure helper for national CurriculumRollout seeding.
 * CBC when academicYear >= 2026 + n (SS1→2027, SS2→2028, SS3→2029).
 */

export const CURRICULUM_ROLLOUT_LEVELS = [
  { canonicalLevel: 'SS1', n: 1, oldLabel: 'Grade 10', newLabel: 'Form 1' },
  { canonicalLevel: 'SS2', n: 2, oldLabel: 'Grade 11', newLabel: 'Form 2' },
  { canonicalLevel: 'SS3', n: 3, oldLabel: 'Grade 12', newLabel: 'Form 3' },
]

export const CURRICULUM_ROLLOUT_YEAR_START = 2025
export const CURRICULUM_ROLLOUT_YEAR_END = 2032

/** Flip year for a level: SS1=2027, SS2=2028, SS3=2029 */
export function cbcFlipYear(n) {
  return 2026 + n
}

export function resolveSyllabusVersionForYear(n, academicYear) {
  return academicYear >= cbcFlipYear(n) ? 'CBC' : 'OLD_SYLLABUS'
}

export function displayLabelForYear(academicYear, oldLabel, newLabel) {
  return academicYear >= 2029 ? newLabel : oldLabel
}

export function buildCurriculumRolloutRows(
  yearStart = CURRICULUM_ROLLOUT_YEAR_START,
  yearEnd = CURRICULUM_ROLLOUT_YEAR_END
) {
  const rows = []

  for (const level of CURRICULUM_ROLLOUT_LEVELS) {
    for (let year = yearStart; year <= yearEnd; year++) {
      rows.push({
        canonicalLevel: level.canonicalLevel,
        academicYear: year,
        displayLabel: displayLabelForYear(year, level.oldLabel, level.newLabel),
        syllabusVersion: resolveSyllabusVersionForYear(level.n, year),
        effectiveFrom: new Date(`${year}-01-01T00:00:00.000Z`),
        effectiveTo: new Date(`${year}-12-31T23:59:59.999Z`),
        notes: null,
      })
    }
  }

  return rows
}
