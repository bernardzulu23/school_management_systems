import { resolveSubjectCatalog } from '@/lib/subjects/resolveSubjectCatalog'

/**
 * Seed level-appropriate subjects for a school tenant.
 */
export async function seedSubjectsForSchool(db, school) {
  const { subjects } = resolveSubjectCatalog({
    schoolLevel: school?.level,
    enabledLocalLanguages: school?.enabledLocalLanguages,
  })

  const usedCodes = new Set()
  const createData = []

  for (const s of subjects) {
    const name = String(s.name || '').trim()
    if (!name) continue

    let code = s.code ? String(s.code) : null
    if (code && usedCodes.has(code)) {
      code = `${code}_${name.substring(0, 3).toUpperCase()}`
    }
    if (code) usedCodes.add(code)

    createData.push({
      schoolId: school.id,
      name,
      code,
      topics: [],
      educationLevel: s.educationLevel || null,
    })
  }

  if (createData.length === 0) return 0

  const result = await db.subject.createMany({
    data: createData,
    skipDuplicates: true,
  })

  return result.count
}

/**
 * Filter DB subject rows to those allowed for the school's education level.
 */
export function filterDbSubjectsByLevel(subjects, educationLevel) {
  if (!educationLevel) return subjects
  return subjects.filter((s) => {
    if (!s.educationLevel) return true
    return s.educationLevel === educationLevel
  })
}
