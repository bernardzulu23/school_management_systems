import fs from 'fs'
import path from 'path'
import { formatCurriculumRecord } from '@/lib/curriculum/format-chunk'

const DATA_PATH = path.join(process.cwd(), 'data', 'curriculum', 'chemistry-cdc-2024.json')

/** @type {import('./types').ChemistryCurriculumDataset | null} */
let cached = null

function loadDataset() {
  if (cached) return cached
  const raw = fs.readFileSync(DATA_PATH, 'utf8')
  cached = JSON.parse(raw)
  return cached
}

export function getChemistryCurriculumMeta() {
  return loadDataset().meta
}

export function getChemistryCurriculumRecords() {
  return loadDataset().curriculum
}

/**
 * @param {string | null | undefined} subject
 */
export function subjectIsChemistry(subject) {
  const s = String(subject || '')
    .trim()
    .toLowerCase()
  if (!s) return false
  return s === 'chemistry' || s === 'chem' || s.includes('chemistry')
}

/**
 * Parse "Form 1", "form 2", "1", etc. to numeric form.
 * @param {string | number | null | undefined} gradeLevel
 */
export function normalizeForm(gradeLevel) {
  if (gradeLevel == null || gradeLevel === '') return null
  if (typeof gradeLevel === 'number' && Number.isFinite(gradeLevel)) return gradeLevel
  const m = String(gradeLevel).match(/(\d+)/)
  return m ? Number(m[1]) : null
}

/**
 * Keyword / topic search over the official CDC chemistry syllabus.
 * @param {{
 *   form?: number | null
 *   topic?: string | null
 *   query?: string | null
 *   limit?: number
 * }} [options]
 * @returns {import('./types').CurriculumRecord[]}
 */
export function searchChemistryCurriculum(options = {}) {
  return searchCurriculumRecords(getChemistryCurriculumRecords(), options)
}

/**
 * Generic keyword/topic search over any CDC-style record set (same shape as the
 * chemistry dataset's `curriculum[]`). Extracted so other subjects with a
 * dedicated `<subject>-cdc-2024.json` corpus can reuse the exact ranking logic.
 * @param {import('./types').CurriculumRecord[]} allRecords
 * @param {{
 *   form?: number | null
 *   topic?: string | null
 *   query?: string | null
 *   limit?: number
 * }} [options]
 * @returns {import('./types').CurriculumRecord[]}
 */
export function searchCurriculumRecords(allRecords, options = {}) {
  const { form = null, topic = null, query = null, limit = 5 } = options
  let records = Array.isArray(allRecords) ? allRecords : []

  if (form != null) {
    records = records.filter((r) => r.form === form)
  }

  const q = String(query || topic || '')
    .toLowerCase()
    .trim()
  if (!q) return records.slice(0, limit)

  const terms = q.split(/\s+/).filter(Boolean)
  const scored = records.map((r) => {
    const hay = [
      r.id,
      r.topic,
      r.subtopic,
      r.topicNumber,
      r.subtopicNumber,
      r.expectedStandard,
      ...(r.keywords || []),
      ...(r.specificCompetences || []),
      ...(r.learningActivities || []),
    ]
      .join(' ')
      .toLowerCase()

    let score = 0
    for (const term of terms) {
      if (r.id.toLowerCase() === term) score += 10
      if (r.subtopic.toLowerCase().includes(term)) score += 4
      if (r.topic.toLowerCase().includes(term)) score += 2
      if (hay.includes(term)) score += 1
    }
    return { r, score }
  })

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.r.form - b.r.form)
    .slice(0, limit)
    .map((x) => x.r)
}

/**
 * @param {import('./types').CurriculumRecord[]} records
 */
export function curriculumRecordsToRagRefs(records) {
  const meta = getChemistryCurriculumMeta()
  return (records || []).map((r, i) => ({
    ref: i + 1,
    chunkId: r.id,
    materialId: 'cdc-chemistry-2024',
    materialTitle: meta.title,
    subject: 'Chemistry',
    chunkIndex: i,
    similarity: 1,
    excerpt: formatCurriculumRecord(r, meta).slice(0, 280),
    source: 'cdc-syllabus',
  }))
}

/**
 * @param {import('./types').CurriculumRecord[]} records
 */
export function curriculumRecordsToRagBlock(records) {
  if (!records?.length) return ''
  const meta = getChemistryCurriculumMeta()
  return (
    'Official Zambia CDC 2024 Chemistry syllabus excerpts (Ministry of Education). ' +
    'Cite as [CDC N] when used.\n\n' +
    records
      .map(
        (r, i) =>
          `[CDC ${i + 1}] Form ${r.form} — ${r.subtopic} (${r.id}):\n${formatCurriculumRecord(r, meta)}`
      )
      .join('\n\n')
  )
}

/**
 * Resolve CDC chemistry context for AI prompts (no embedding required).
 * @param {{
 *   subject?: string | null
 *   gradeLevel?: string | number | null
 *   query?: string | null
 *   topic?: string | null
 *   limit?: number
 * }} params
 */
export function buildChemistryCurriculumContext(params = {}) {
  if (!subjectIsChemistry(params.subject)) {
    return { block: '', refs: [], records: [], enabled: false }
  }

  const form = normalizeForm(params.gradeLevel)
  const records = searchChemistryCurriculum({
    form,
    topic: params.topic,
    query: params.query,
    limit: params.limit ?? 5,
  })

  if (!records.length) {
    return { block: '', refs: [], records: [], enabled: true }
  }

  return {
    block: curriculumRecordsToRagBlock(records),
    refs: curriculumRecordsToRagRefs(records),
    records,
    enabled: true,
    source: 'cdc-chemistry-2024',
  }
}
