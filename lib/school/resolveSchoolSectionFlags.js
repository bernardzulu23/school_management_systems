import { resolveEducationLevelFromGrade } from '@/lib/subjects/resolveSubjectCatalog'

function normalizeLevel(level) {
  const raw = String(level || '')
    .trim()
    .toLowerCase()
  if (raw === 'primary' || raw === 'secondary' || raw === 'combined') return raw
  return ''
}

export function isPrimaryClassRecord(classItem) {
  const yearGroup = String(classItem?.year_group || classItem?.yearGroup || '').trim()
  const name = String(classItem?.name || '').trim()
  const raw = `${yearGroup} ${name}`.toLowerCase()
  if (/\b(ece|reception)\b/.test(raw)) return true
  return (
    resolveEducationLevelFromGrade(yearGroup) === 'primary' ||
    resolveEducationLevelFromGrade(name) === 'primary'
  )
}

function isSecondaryClassRecord(classItem) {
  if (isPrimaryClassRecord(classItem)) return false
  const yearGroup = String(classItem?.year_group || classItem?.yearGroup || '').trim()
  const name = String(classItem?.name || '').trim()
  return (
    resolveEducationLevelFromGrade(yearGroup) === 'secondary' ||
    resolveEducationLevelFromGrade(name) === 'secondary'
  )
}

/**
 * Resolve whether a school should expose primary vs secondary UI.
 * Declared School.level wins for pure primary/secondary.
 * For combined (or unknown), refine using active class year groups when present
 * so secondary-only campuses wrongly marked "combined" never get primary nav
 * (e.g. Senior Teachers).
 *
 * @param {{ level?: string | null }} school
 * @param {Array<{ year_group?: string, yearGroup?: string, name?: string }>} [classes]
 * @returns {{ hasPrimary: boolean, hasSecondary: boolean, level: string }}
 */
export function resolveSchoolSectionFlags(school, classes = []) {
  const level = normalizeLevel(school?.level)
  const rows = Array.isArray(classes) ? classes : []

  let hasPrimary = level === 'primary' || level === 'combined'
  let hasSecondary = level === 'secondary' || level === 'combined'

  if (level === 'primary') {
    return { hasPrimary: true, hasSecondary: false, level: 'primary' }
  }
  if (level === 'secondary') {
    return { hasPrimary: false, hasSecondary: true, level: 'secondary' }
  }

  if (rows.length > 0) {
    const fromPrimary = rows.some(isPrimaryClassRecord)
    const fromSecondary = rows.some(isSecondaryClassRecord)
    if (level === 'combined' || !level) {
      hasPrimary = fromPrimary
      hasSecondary = fromSecondary
      // Empty parse of year groups should not grant both — fail closed.
      if (!fromPrimary && !fromSecondary) {
        hasPrimary = false
        hasSecondary = false
      }
    }
  }

  return {
    hasPrimary: Boolean(hasPrimary),
    hasSecondary: Boolean(hasSecondary),
    level: level || 'combined',
  }
}
