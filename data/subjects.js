/**
 * Backward-compatible re-export. Prefer resolveSubjectCatalog() for level-aware lists.
 */
export { SECONDARY_SUBJECTS as SCHOOL_SUBJECTS } from '@/data/subjects-secondary'
export { SECONDARY_SUBJECT_CATEGORIES as SUBJECT_CATEGORIES } from '@/data/subjects-secondary'
export { PRIMARY_SUBJECTS } from '@/data/subjects-primary'
export { SECONDARY_SUBJECTS } from '@/data/subjects-secondary'

import { SECONDARY_SUBJECTS } from '@/data/subjects-secondary'

export const getSubjectById = (id) => SECONDARY_SUBJECTS.find((subject) => subject.id === id)

export const getSubjectsByCategory = (category) =>
  SECONDARY_SUBJECTS.filter((subject) => subject.category === category)

export const getSubjectsByIds = (ids) =>
  SECONDARY_SUBJECTS.filter((subject) => ids.includes(subject.id))

export const searchSubjects = (query) => {
  const lowercaseQuery = query.toLowerCase()
  return SECONDARY_SUBJECTS.filter(
    (subject) =>
      subject.name.toLowerCase().includes(lowercaseQuery) ||
      subject.code.toLowerCase().includes(lowercaseQuery)
  )
}
