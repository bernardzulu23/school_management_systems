import { resolveSubjectCatalog } from '@/lib/subjects/resolveSubjectCatalog'

/**
 * Seed level-appropriate subjects for a school tenant.
 */
export async function seedSubjectsForSchool(db, school) {
  const level = String(school?.level || '').toLowerCase()
  const catalogs =
    level === 'combined' || !level
      ? [
          resolveSubjectCatalog({
            schoolLevel: 'primary',
            enabledLocalLanguages: school?.enabledLocalLanguages,
          }),
          resolveSubjectCatalog({
            schoolLevel: 'secondary',
            enabledLocalLanguages: school?.enabledLocalLanguages,
          }),
        ]
      : [
          resolveSubjectCatalog({
            schoolLevel: school?.level,
            enabledLocalLanguages: school?.enabledLocalLanguages,
          }),
        ]

  const usedCodes = new Set()
  const createData = []
  const seenNames = new Set()

  for (const catalog of catalogs) {
    for (const s of catalog.subjects) {
      const name = String(s.name || '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (seenNames.has(key)) continue
      seenNames.add(key)

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
        educationLevel: s.educationLevel || catalog.educationLevel || null,
      })
    }
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
 * Null/unknown educationLevel on a row is treated as secondary legacy data and
 * is excluded when asking for primary subjects.
 */
export function filterDbSubjectsByLevel(subjects, educationLevel) {
  if (!educationLevel) return []
  return (subjects || []).filter((s) => {
    const rowLevel = String(s.educationLevel || '')
      .trim()
      .toLowerCase()
    if (!rowLevel) {
      return educationLevel === 'secondary'
    }
    return rowLevel === String(educationLevel).toLowerCase()
  })
}
