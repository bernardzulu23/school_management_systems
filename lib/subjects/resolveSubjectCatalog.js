import { PRIMARY_SUBJECTS, PRIMARY_SUBJECT_CATEGORIES } from '@/data/subjects-primary'
import { SECONDARY_SUBJECTS, SECONDARY_SUBJECT_CATEGORIES } from '@/data/subjects-secondary'
import { GRADE_LEVELS, SCHOOL_LEVELS } from '@/lib/zambiaSchoolFeatures'

const FORM_TO_GRADE = {
  1: 8,
  2: 9,
  3: 10,
  4: 11,
  5: 12,
  6: 12,
}

/** Map year_group / class label to education level. */
export function resolveEducationLevelFromGrade(gradeLevel) {
  const raw = String(gradeLevel || '').trim()
  if (!raw) return null

  if (/^(ece|reception)$/i.test(raw)) {
    return SCHOOL_LEVELS.PRIMARY
  }

  const gradeMatch = raw.match(/^grade\s*(\d{1,2})$/i)
  if (gradeMatch) {
    const n = Number(gradeMatch[1])
    if (n >= 1 && n <= 7) return SCHOOL_LEVELS.PRIMARY
    if (n >= 8 && n <= 12) return SCHOOL_LEVELS.SECONDARY
  }

  const formMatch = raw.match(/^form\s*(\d)$/i)
  if (formMatch) {
    return SCHOOL_LEVELS.SECONDARY
  }

  const gKey = raw.toUpperCase().replace(/\s+/g, '')
  if (GRADE_LEVELS[gKey]) {
    return GRADE_LEVELS[gKey].level
  }

  const numericOnly = raw.match(/^(\d{1,2})$/)
  if (numericOnly) {
    const n = Number(numericOnly[1])
    if (n >= 1 && n <= 7) return SCHOOL_LEVELS.PRIMARY
    if (n >= 8 && n <= 12) return SCHOOL_LEVELS.SECONDARY
  }

  return null
}

export function resolveCatalogEducationLevel({ schoolLevel, gradeLevel } = {}) {
  const level = String(schoolLevel || SCHOOL_LEVELS.COMBINED).toLowerCase()

  if (level === SCHOOL_LEVELS.PRIMARY) return SCHOOL_LEVELS.PRIMARY
  if (level === SCHOOL_LEVELS.SECONDARY) return SCHOOL_LEVELS.SECONDARY

  const fromGrade = resolveEducationLevelFromGrade(gradeLevel)
  if (fromGrade) return fromGrade

  return SCHOOL_LEVELS.SECONDARY
}

function filterLocalLanguages(subjects, enabledLocalLanguages) {
  if (!Array.isArray(enabledLocalLanguages) || enabledLocalLanguages.length === 0) {
    return subjects
  }
  const enabled = new Set(enabledLocalLanguages.map((c) => String(c).toUpperCase()))
  return subjects.filter((s) => !s.isLocalLanguage || enabled.has(String(s.code).toUpperCase()))
}

export function resolveSubjectCatalog({
  schoolLevel = SCHOOL_LEVELS.COMBINED,
  gradeLevel = null,
  enabledLocalLanguages = null,
} = {}) {
  const educationLevel = resolveCatalogEducationLevel({ schoolLevel, gradeLevel })
  const isPrimary = educationLevel === SCHOOL_LEVELS.PRIMARY

  const subjects = isPrimary ? PRIMARY_SUBJECTS : SECONDARY_SUBJECTS
  const categories = isPrimary ? PRIMARY_SUBJECT_CATEGORIES : SECONDARY_SUBJECT_CATEGORIES

  const filtered = isPrimary ? filterLocalLanguages(subjects, enabledLocalLanguages) : subjects

  const grouped = categories.reduce((acc, category) => {
    const items = filtered.filter((s) => s.category === category.id)
    if (items.length > 0) acc[category.id] = items
    return acc
  }, {})

  return {
    educationLevel,
    subjects: filtered,
    categories,
    grouped,
  }
}

export function getSubjectLimits(educationLevel) {
  if (educationLevel === SCHOOL_LEVELS.PRIMARY) {
    return { min: 8, max: 12 }
  }
  return { min: 7, max: 9 }
}

export function isSecondaryEducationLevel(educationLevel) {
  return educationLevel === SCHOOL_LEVELS.SECONDARY
}

export function canAccessEczFeatures({ schoolLevel, gradeLevel } = {}) {
  const level = String(schoolLevel || '').toLowerCase()
  if (level === SCHOOL_LEVELS.PRIMARY) return false
  if (level === SCHOOL_LEVELS.SECONDARY) return true
  if (level === SCHOOL_LEVELS.COMBINED) {
    const resolved = resolveEducationLevelFromGrade(gradeLevel)
    if (!resolved) return true
    return resolved === SCHOOL_LEVELS.SECONDARY
  }
  const resolved = resolveEducationLevelFromGrade(gradeLevel)
  return resolved === SCHOOL_LEVELS.SECONDARY
}

export function canAccessHodFeatures({ schoolLevel } = {}) {
  return String(schoolLevel || '').toLowerCase() !== SCHOOL_LEVELS.PRIMARY
}

export function canAccessSecondaryGrading({ schoolLevel, gradeLevel } = {}) {
  return canAccessEczFeatures({ schoolLevel, gradeLevel })
}
