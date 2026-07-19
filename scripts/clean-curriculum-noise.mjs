/**
 * Deterministically strip OCR / PDF-extraction noise from the teaching-module-derived
 * curriculum files in data/curriculum/form1-4/<slug>-form1-4.json.
 *
 * The 12 subjects populated by scripts/populate-curriculum-from-modules.mjs inherit
 * noise from the source PDFs: table-of-contents lines with dotted leaders, bare page
 * numbers, preface/foreword prose, ministry boilerplate, acknowledgement credit lines,
 * lesson-plan table headers, and words whose spaces were lost during extraction.
 *
 * This script removes clearly-junk *whole items* from the title / topics /
 * learningOutcomes / suggestedActivities / assessmentMethods / resources fields, drops
 * units that end up with no grounding content, and renumbers the survivors. It NEVER
 * rewrites the internal text of a legitimate line — it only drops entire noise items —
 * so the transformation is fully deterministic and reviewable.
 *
 * SAFETY: every subject is re-checked after cleaning. If cleaning would leave a subject
 * with zero grounding-useful units, the original file is left untouched and the subject
 * is reported as BACKED_OFF.
 *
 * Usage:
 *   node scripts/clean-curriculum-noise.mjs           # dry run (report only)
 *   node scripts/clean-curriculum-noise.mjs --write    # write cleaned files
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const CURRICULUM_DIR = path.join(ROOT, 'data', 'curriculum', 'form1-4')
const WRITE = process.argv.includes('--write')

/** The 12 teaching-module-derived subjects to clean (by filename slug). */
const SLUGS = [
  'art-and-design',
  'civic-education',
  'computer-studies',
  'design-and-technology',
  'food-and-nutrition',
  'french',
  'geography',
  'history',
  'mathematics',
  'religious-education',
  'travel-and-tourism',
  'zambian-languages',
]

/**
 * Section / table / meta labels that are never curriculum content. Compared against a
 * normalized form of each item (lowercased, letters+digits only) so both spaced and
 * space-lost OCR variants are caught (e.g. "MINISTRY OF EDUCATION" and "MINISTRYOFEDUCATION").
 */
const BOILERPLATE_EXACT = new Set([
  'ministryofeducation',
  'teachingmodule',
  'tableofcontents',
  'preface',
  'foreword',
  'acknowledgement',
  'acknowledgements',
  'introduction',
  'overview',
  'summary',
  'conclusion',
  'rationale',
  'references',
  'reference',
  'bibliography',
  'criteria',
  'development',
  'application',
  'exercise',
  'homework',
  'recap',
  'keypoints',
  'keypointsrecap',
  'generalcompetence',
  'generalcompetences',
  'contenttip',
  'contenttips',
  'learningenvironment',
  'learningenvironmentsetup',
  'learningenvironmentsetupup',
  'suggestedteachingmethodology',
  'suggestedteachingandlearningmaterials',
  'suggestedlearningteachingmaterials',
  'teachingandlearningmaterials',
  'samplequestions',
  'samplequestion',
  'sampleanswer',
  'sampleanswers',
  'essayquestions',
  'essayquestion',
  'openendedquestions',
  'applicationbasedquestions',
  'knowledgebasedquestions',
  'multiplechoice',
  'multiplechoicequestions',
  'multiplechoicequestionsmcqs',
  'problemposing',
  'activityprocess',
  'lessonplan',
  'lessonprogression',
  'expectedstandard',
  'timeallocation',
  'thecurriculumdevelopmentcentre',
  'curriculumdevelopmentcentre',
  'nameschoolorganisation',
  'teachers',
  'learners',
  'activityand',
  'teachersrole',
  'learnersrole',
])

/**
 * High-signal preface/foreword and ministry-boilerplate phrases. Matched as a
 * case-insensitive substring; these appear only in teacher-facing front matter, not in
 * the syllabus content itself.
 */
const FOREWORD_PHRASES = [
  'as a ministry',
  'as the ministry',
  'this module reflects',
  'this module has been',
  'the module reflects',
  'transitioning to a new curriculum',
  'new curriculum framework',
  'supplement this module',
  'evaluate the module',
  'use this module',
  'using this module',
  'objectives of the module',
  'how to use this module',
  'it is hoped that',
  'permanent secretary',
  'ministry of education',
  'curriculum development centre',
  'competence-based curriculum',
  'competence based curriculum',
  'zambia education curriculum framework',
  'consultative and participatory',
  // Shared CBC preface / foreword template phrasing (front matter, not syllabus content).
  'we understand the challenges',
  'we acknowledge the challenges',
  'gaps that may arise',
  'this journey as smooth',
  'encouraged to tailor',
  'structured guidance',
  'alternative acceptable approaches',
  'adaptability to different school contexts',
  'research and innovations to address',
  'meaningful and impactful',
  'regardless of their environment',
  'desirable lifelong skills',
]

function normalizeAlnum(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Decide whether a single string is clearly extraction noise (and should be dropped).
 * Conservative by design: when in doubt it returns false (keep the line).
 *
 * @param {string} raw
 * @param {string} subjectName
 * @returns {boolean}
 */
function isNoise(raw, subjectName) {
  const t = String(raw || '').trim()
  if (!t) return true

  // 1. TOC dotted leaders, e.g. "Colours ........... 6".
  if (/\.{4,}/.test(t)) return true

  // 2. Bare page markers / numbering / roman numerals only, e.g. "6", "1.6", "| Page".
  if (/^[\divxlcIVXLC.\)\(\s|]+$/.test(t) && /[\divxlc]/i.test(t)) return true
  if (/^\|?\s*\d*\s*\|?\s*page\b/i.test(t)) return true
  if (/^unit\s*:?\s*\d+$/i.test(t)) return true

  // 2b. Running headers ("Form 1 Term 2"), section labels and editorial notes.
  if (/^form\s*\d\s*term\s*\d*$/i.test(t)) return true
  if (/^learning activit(?:y|ies)\s*\d*$/i.test(t)) return true
  if (/^note\s*:/i.test(t)) return true

  // 3. Words whose spaces were lost during OCR, e.g. "AsaMinistry,weunderstand...".
  //    A genuine token is rarely 22+ chars with no whitespace; URLs are exempt.
  if (!/\s/.test(t) && t.length >= 22 && /[a-z]/.test(t) && !/https?:|www\.|@/i.test(t)) {
    return true
  }

  const norm = normalizeAlnum(t)

  // 4. Section / table / meta labels that carry no syllabus content.
  if (BOILERPLATE_EXACT.has(norm)) return true

  // 5. Running header = the subject name on its own line.
  if (norm && norm === normalizeAlnum(subjectName)) return true

  // 6. Ministry / preface / foreword prose.
  const lower = t.toLowerCase()
  if (FOREWORD_PHRASES.some((p) => lower.includes(p))) return true

  // 7. Author / contributor credit lines, e.g. "Kelvin Mambwe (PhD)",
  //    "Chitonga: ... – Teacher - Riverview secondary",
  //    "Cecilia Langi : Lua-Lua Secondary School, Kasama".
  if (/\((?:mr|mrs|ms|dr|prof|phd)\.?\)/i.test(t)) return true
  if (/[–-]\s*(?:teacher|lecturer|head\s?teacher|hod)\b/i.test(t)) return true
  if (
    /^[A-Z][a-zʼ']+\s+[A-Z][a-zʼ']+\s*:\s/.test(t) &&
    /(secondary school|basic school|college|university)/i.test(t)
  ) {
    return true
  }

  // 7b. Glued lesson-plan table-header fragments, e.g.
  //     "STAGESCONTENTTEACHER’S ROLELEARNERS’ ROLE", "STAGESTEACHER’S ACTIVITY AND".
  if (norm.includes('stagescontent') || norm.includes('stagesteacher')) return true

  // 8. Short title-case TOC entries ending in a bare page number, e.g.
  //    "Classroom Orders and Instructions 6". Guarded to avoid real prose:
  //    single trailing number, no other digits, no sentence punctuation, <=7 words.
  if (
    /^[A-Z][^.,;:!?]*\s\d{1,3}$/.test(t) &&
    t.split(/\s+/).length <= 7 &&
    !/\d/.test(t.replace(/\s\d{1,3}$/, ''))
  ) {
    return true
  }

  return false
}

function cleanArray(arr, subjectName) {
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  const out = []
  for (const item of arr) {
    const t = String(item || '').trim()
    if (!t || isNoise(t, subjectName)) continue
    if (seen.has(t)) continue // drop exact duplicates within the same field
    seen.add(t)
    out.push(t)
  }
  return out
}

function cleanTitle(title, subjectName, fallback) {
  const t = String(title || '').trim()
  if (!t || isNoise(t, subjectName)) return fallback
  return t
}

function unitHasContent(u) {
  const buckets = [u.topics, u.learningOutcomes, u.suggestedActivities, u.assessmentMethods]
  return buckets.some((b) => Array.isArray(b) && b.some((x) => String(x || '').trim()))
}

function cleanUnit(unit, subjectName, index) {
  return {
    title: cleanTitle(unit.title, subjectName, `Unit ${index + 1}`),
    topics: cleanArray(unit.topics, subjectName),
    learningOutcomes: cleanArray(unit.learningOutcomes, subjectName),
    suggestedActivities: cleanArray(unit.suggestedActivities, subjectName),
    assessmentMethods: cleanArray(unit.assessmentMethods, subjectName),
    resources: cleanArray(unit.resources, subjectName),
  }
}

const report = []

for (const slug of SLUGS) {
  const filePath = path.join(CURRICULUM_DIR, `${slug}-form1-4.json`)
  if (!fs.existsSync(filePath)) {
    report.push({ slug, status: 'SKIP', reason: 'file missing' })
    continue
  }

  const original = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const subjectName = original.subject || slug
  const beforeUnits = Array.isArray(original.units) ? original.units.length : 0

  const cleanedUnits = (original.units || [])
    .map((u, i) => cleanUnit(u, subjectName, i))
    .filter(unitHasContent)
    .map((u, i) => ({ unitNumber: i + 1, ...u }))

  const afterUnits = cleanedUnits.length

  // Safety net: never empty a subject's grounding. Back off and keep the original.
  if (afterUnits === 0) {
    report.push({
      slug,
      status: 'BACKED_OFF',
      before: beforeUnits,
      after: beforeUnits,
      reason: 'cleaning would remove all grounding-useful units; original kept',
    })
    continue
  }

  const out = {
    ...original,
    units: cleanedUnits,
    metadata: {
      ...(original.metadata || {}),
      cleaned: true,
      cleanedAt: new Date().toISOString(),
      cleanupScript: 'scripts/clean-curriculum-noise.mjs',
    },
  }

  report.push({
    slug,
    status: WRITE ? 'WROTE' : 'DRY',
    before: beforeUnits,
    after: afterUnits,
    dropped: beforeUnits - afterUnits,
  })

  if (WRITE) {
    fs.writeFileSync(filePath, JSON.stringify(out, null, 2) + '\n', 'utf8')
  }
}

console.log(JSON.stringify(report, null, 2))
