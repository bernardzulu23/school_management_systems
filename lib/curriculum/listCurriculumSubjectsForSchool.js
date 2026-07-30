import fs from 'fs'
import path from 'path'
import { listAvailableCurriculumSubjects } from '@/lib/curriculum/jsonCurriculumLoader'
import { resolveSubjectCatalog } from '@/lib/subjects/resolveSubjectCatalog'

/**
 * List built-in curriculum subjects filtered to the school catalog.
 * Primary schools only see primary corpus subjects that also exist in the
 * primary subject catalog (or have files under data/curriculum/primary).
 */
export function listCurriculumSubjectsForSchool({
  schoolLevel,
  gradeLevel = null,
  enabledLocalLanguages = null,
} = {}) {
  const catalog = resolveSubjectCatalog({
    schoolLevel,
    gradeLevel,
    enabledLocalLanguages,
  })
  const educationLevel = catalog.educationLevel
  const all = listAvailableCurriculumSubjects({ educationLevel })

  if (!educationLevel) return []

  const allowed = new Set(
    (catalog.subjects || []).map((s) =>
      String(s.name || '')
        .trim()
        .toLowerCase()
    )
  )

  // Always include subjects that have on-disk primary/secondary corpora even if
  // catalog naming differs slightly (e.g. Technology Studies vs CTS).
  const corpusOnly = listCorpusSubjectsInLevelDir(educationLevel)

  return all
    .filter((name) => {
      const key = String(name || '')
        .trim()
        .toLowerCase()
      if (allowed.has(key)) return true
      return corpusOnly.has(key)
    })
    .sort((a, b) => a.localeCompare(b))
}

function listCorpusSubjectsInLevelDir(educationLevel) {
  const root = path.join(process.cwd(), 'data', 'curriculum')
  const dir =
    educationLevel === 'primary'
      ? path.join(root, 'primary')
      : educationLevel === 'secondary'
        ? null
        : null
  const names = new Set()
  if (!dir || !fs.existsSync(dir)) return names
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.toLowerCase().endsWith('.json')) continue
    if (entry.includes('validation')) continue
    const base = entry
      .replace(/\.json$/i, '')
      .replace(/-cdc-2024$/i, '')
      .replace(/-grade\d+-\d+$/i, '')
      .replace(/-form\d+-\d+$/i, '')
    const label = base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    if (label) names.add(label.toLowerCase())
  }
  return names
}
