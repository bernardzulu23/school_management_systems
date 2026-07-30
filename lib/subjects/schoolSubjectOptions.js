import { getGradeLevelsForSchoolLevel } from '@/lib/constants'
import { PRIMARY_SUBJECTS } from '@/data/subjects-primary'
import { SECONDARY_SUBJECTS } from '@/data/subjects-secondary'
import { resolveSubjectCatalog } from '@/lib/subjects/resolveSubjectCatalog'

/**
 * Grade labels for UI selectors, keyed by school level.
 */
export function getSchoolGradeOptions(schoolLevel, gradeLevel = null) {
  const level = String(schoolLevel || '').toLowerCase()
  if (level === 'primary') return getGradeLevelsForSchoolLevel('primary')
  if (level === 'secondary') return getGradeLevelsForSchoolLevel('secondary')
  if (gradeLevel) {
    const catalogLevel = resolveSubjectCatalog({
      schoolLevel: 'combined',
      gradeLevel,
    }).educationLevel
    if (catalogLevel === 'primary') return getGradeLevelsForSchoolLevel('primary')
    if (catalogLevel === 'secondary') return getGradeLevelsForSchoolLevel('secondary')
  }
  return getGradeLevelsForSchoolLevel('combined')
}

/**
 * Subject name list for UI selectors. Prefer teaching assignments when provided.
 */
export function getSchoolSubjectNameOptions({
  schoolLevel,
  gradeLevel = null,
  assignmentSubjects = [],
  enabledLocalLanguages = null,
} = {}) {
  const fromAssignments = [
    ...new Set((assignmentSubjects || []).map((name) => String(name || '').trim()).filter(Boolean)),
  ]
  if (fromAssignments.length) return fromAssignments

  const catalog = resolveSubjectCatalog({
    schoolLevel,
    gradeLevel,
    enabledLocalLanguages,
  })
  if (catalog.subjects.length) {
    return catalog.subjects.map((s) => s.name)
  }

  const level = String(schoolLevel || '').toLowerCase()
  if (level === 'primary') return PRIMARY_SUBJECTS.map((s) => s.name)
  if (level === 'secondary') return SECONDARY_SUBJECTS.map((s) => s.name)
  return []
}

/**
 * Resolve a class/year label from a teaching assignment DTO.
 */
export function resolveAssignmentGradeLabel(assignment) {
  const yearGroup = String(assignment?.classYearGroup || '').trim()
  if (yearGroup) return yearGroup
  const className = String(assignment?.className || '').trim()
  if (!className) return ''
  const grade = className.match(/\b(Grade\s*[1-7]|ECE|Reception)\b/i)
  if (grade) return grade[1].replace(/\s+/g, ' ')
  const form = className.match(/\bForm\s*([1-6])\b/i)
  if (form) return `Form ${form[1]}`
  return className
}
