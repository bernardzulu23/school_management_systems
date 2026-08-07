/**
 * Shared secondary level ordering for CurriculumRollout (SS1–SS3) and Class.year_group (Form 1–4).
 * One comparator for rollout + SBA startsAtLevel checks.
 */

const RANK_BY_TOKEN = {
  SS1: 1,
  SS2: 2,
  SS3: 3,
  'FORM 1': 1,
  'FORM 2': 2,
  'FORM 3': 3,
  'FORM 4': 4,
  'GRADE 10': 1,
  'GRADE 11': 2,
  'GRADE 12': 3,
}

/**
 * @param {string | null | undefined} level
 * @returns {number | null} rank or null if unrecognised
 */
export function secondaryLevelRank(level) {
  const raw = String(level || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
  if (!raw) return null

  if (RANK_BY_TOKEN[raw] != null) return RANK_BY_TOKEN[raw]

  const formMatch = raw.match(/^FORM\s*([1-4])\b/)
  if (formMatch) return Number(formMatch[1])

  const ssMatch = raw.match(/^SS\s*([1-3])\b/)
  if (ssMatch) return Number(ssMatch[1])

  const gradeMatch = raw.match(/^GRADE\s*(10|11|12)\b/)
  if (gradeMatch) {
    const g = Number(gradeMatch[1])
    return g - 9
  }

  return null
}

/**
 * True when classLevel is at or above startsAtLevel (e.g. Form 3 >= Form 2).
 * Unrecognised either side → false (fail closed).
 */
export function levelAtOrAbove(classLevel, startsAtLevel) {
  const classRank = secondaryLevelRank(classLevel)
  const startRank = secondaryLevelRank(startsAtLevel)
  if (classRank == null || startRank == null) return false
  return classRank >= startRank
}

/**
 * Map Class.year_group / Form label to CurriculumRollout canonicalLevel (SS1–SS3).
 * Form 4 maps to SS3 (senior secondary terminal cohort for syllabus resolution).
 */
export function yearGroupToCanonicalLevel(yearGroup) {
  const rank = secondaryLevelRank(yearGroup)
  if (rank == null) return null
  if (rank <= 1) return 'SS1'
  if (rank === 2) return 'SS2'
  return 'SS3'
}
