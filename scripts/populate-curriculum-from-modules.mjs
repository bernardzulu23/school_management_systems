/**
 * Populate empty data/curriculum/form1-4/<slug>-form1-4.json files by transforming
 * the in-repo authoritative teaching-module extractions (data/teaching-modules/<slug>/*.json)
 * into the unit-format curriculum schema consumed by loadJsonCurriculum().
 *
 * Pure data transformation:
 *   lesson.title      -> unit.title
 *   lesson.topics     -> unit.topics
 *   lesson.activities -> unit.suggestedActivities
 *   lesson.assessment -> unit.assessmentMethods
 *   lesson.resources  -> unit.resources
 * (teaching modules carry no explicit learningOutcomes; left empty.)
 *
 * Usage:
 *   node scripts/populate-curriculum-from-modules.mjs           # dry run (report only)
 *   node scripts/populate-curriculum-from-modules.mjs --write   # write files
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const MODULES_DIR = path.join(ROOT, 'data', 'teaching-modules')
const CURRICULUM_DIR = path.join(ROOT, 'data', 'curriculum', 'form1-4')
const WRITE = process.argv.includes('--write')

function slugifySubject(subject) {
  return String(subject || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v || '').trim()).filter(Boolean)
}

/** A unit grounds usefully only if it carries real syllabus detail. */
function unitHasContent(u) {
  const buckets = [u.topics, u.learningOutcomes, u.suggestedActivities, u.assessmentMethods]
  return buckets.some((b) => Array.isArray(b) && b.some((x) => String(x || '').trim()))
}

/**
 * Read all teaching-module files in a directory, returning lessons in a stable
 * order (sorted by filename) alongside the source file names.
 */
function readModuleLessons(dir, titlePrefix = '') {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .sort()
  const lessons = []
  const sources = []
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    sources.push(j.sourceFile || f)
    for (const l of j.lessons || []) {
      lessons.push({ lesson: l, prefix: titlePrefix })
    }
  }
  return { lessons, sources }
}

function lessonToUnit(entry, index) {
  const { lesson, prefix } = entry
  const title = String(lesson.title || `Unit ${index + 1}`).trim()
  return {
    title: prefix ? `${prefix}: ${title}` : title,
    topics: asStringArray(lesson.topics),
    learningOutcomes: [],
    suggestedActivities: asStringArray(lesson.activities),
    assessmentMethods: asStringArray(lesson.assessment),
    resources: asStringArray(lesson.resources),
  }
}

/**
 * subject slug -> transformation config.
 * `dirs` maps a source teaching-module directory to an optional unit-title prefix
 * (used to disambiguate the multi-language "Zambian Languages" aggregate).
 */
const CONFIG = {
  'art-and-design': { dirs: [['art-and-design', '']] },
  'civic-education': { dirs: [['civic-education', '']] },
  'computer-studies': { dirs: [['computer-studies', '']] },
  'design-and-technology': { dirs: [['design-and-technology', '']] },
  'food-and-nutrition': { dirs: [['food-and-nutrition', '']] },
  french: { dirs: [['french', '']] },
  geography: { dirs: [['geography', '']] },
  history: { dirs: [['history', '']] },
  mathematics: { dirs: [['mathematics', '']] },
  'religious-education': { dirs: [['religious-education', '']] },
  'travel-and-tourism': { dirs: [['travel-and-tourism', '']] },
  'zambian-languages': {
    dirs: [
      ['chitonga', 'Chitonga'],
      ['cinyanja', 'Cinyanja'],
      ['icibemba', 'Icibemba'],
      ['kikaonde', 'Kikaonde'],
      ['lunda', 'Lunda'],
      ['luvale', 'Luvale'],
      ['silozi', 'Silozi'],
    ],
  },
}

const report = []

for (const [slug, cfg] of Object.entries(CONFIG)) {
  const targetPath = path.join(CURRICULUM_DIR, `${slug}-form1-4.json`)
  if (!fs.existsSync(targetPath)) {
    report.push({ slug, status: 'SKIP', reason: 'target file missing' })
    continue
  }
  const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'))

  let allLessons = []
  const allSources = []
  for (const [dirName, prefix] of cfg.dirs) {
    const dir = path.join(MODULES_DIR, dirName)
    if (!fs.existsSync(dir)) continue
    const { lessons, sources } = readModuleLessons(dir, prefix)
    allLessons = allLessons.concat(lessons)
    allSources.push(...sources)
  }

  // Keep only grounding-useful units (title-only / empty rows are dropped so the
  // shipped file matches what buildCurriculumContextBlock() will actually surface),
  // then renumber sequentially.
  const units = allLessons
    .map((entry, i) => lessonToUnit(entry, i))
    .filter(unitHasContent)
    .map((u, i) => ({ unitNumber: i + 1, ...u }))

  if (!units.length) {
    report.push({ slug, status: 'NO_CONTENT', reason: 'no content-bearing units in source' })
    continue
  }

  // Write using the same subject→slug logic the loader (slugifySubject) relies on,
  // so the filename is guaranteed to be resolvable by loadJsonCurriculum().
  const outSlug = slugifySubject(existing.subject) || slug
  const outPath = path.join(CURRICULUM_DIR, `${outSlug}-form1-4.json`)

  const out = {
    subject: existing.subject,
    level: existing.level || 'Form 1-4',
    gradesCovered: existing.gradesCovered || [7, 8, 9, 10],
    totalDuration: existing.totalDuration || undefined,
    units,
    metadata: {
      source: allSources.join('; '),
      derivedFrom: cfg.dirs.map(([d]) => `data/teaching-modules/${d}`),
      extractedAt: new Date().toISOString(),
      curated: true,
    },
  }
  if (out.totalDuration === undefined) delete out.totalDuration

  report.push({
    slug: outSlug,
    status: WRITE ? 'WROTE' : 'DRY',
    units: units.length,
    sources: allSources,
  })

  if (WRITE) {
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8')
  }
}

console.log(JSON.stringify(report, null, 2))
