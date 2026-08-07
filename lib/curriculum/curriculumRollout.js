/**
 * Pure helper for national CurriculumRollout seeding.
 * MoE timeline: Form 1 CBC from 2025 → Form 2 CBC from 2026 → Form 3 CBC from 2027.
 * CBC when academicYear >= 2024 + n (SS1→2025, SS2→2026, SS3→2027).
 */

export const CURRICULUM_ROLLOUT_LEVELS = [
  { canonicalLevel: 'SS1', n: 1, oldLabel: 'Grade 10', newLabel: 'Form 1' },
  { canonicalLevel: 'SS2', n: 2, oldLabel: 'Grade 11', newLabel: 'Form 2' },
  { canonicalLevel: 'SS3', n: 3, oldLabel: 'Grade 12', newLabel: 'Form 3' },
]

export const CURRICULUM_ROLLOUT_YEAR_START = 2025
export const CURRICULUM_ROLLOUT_YEAR_END = 2032

/** Flip year for a level: SS1=2025, SS2=2026, SS3=2027 */
export function cbcFlipYear(n) {
  return 2024 + n
}

export function resolveSyllabusVersionForYear(n, academicYear) {
  return academicYear >= cbcFlipYear(n) ? 'CBC' : 'OLD_SYLLABUS'
}

export function displayLabelForYear(academicYear, oldLabel, newLabel) {
  // Prefer Form labels once CBC cohort has entered SS1 (2025+).
  return academicYear >= 2025 ? newLabel : oldLabel
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
