/**
 * Assert a requested subject belongs to the school's level catalog.
 * Combined schools must supply gradeLevel so the catalog can resolve.
 */
import { isSubjectInCatalog } from '@/lib/subjects/resolveSubjectCatalog'

/**
 * @param {string} subjectName
 * @param {{
 *   schoolLevel?: string | null,
 *   gradeLevel?: string | null,
 *   enabledLocalLanguages?: string[] | null
 * }} [options]
 */
export function assertSubjectInSchoolCatalog(
  subjectName,
  { schoolLevel, gradeLevel = null, enabledLocalLanguages = null } = {}
) {
  const name = String(subjectName || '').trim()
  if (!name) {
    const err = new Error('Subject is required')
    err.status = 400
    throw err
  }
  const ok = isSubjectInCatalog(name, {
    schoolLevel,
    gradeLevel,
    enabledLocalLanguages,
  })
  if (!ok) {
    const err = new Error(
      `Subject "${name}" is not available for this school level${
        gradeLevel ? ` / ${gradeLevel}` : ''
      }`
    )
    err.status = 400
    throw err
  }
  return name
}
