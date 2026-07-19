/**
 * Generic two-tier CDC curriculum grounding for AI prompts across ALL subjects.
 *
 * No subject is special-cased by name. Grounding is resolved purely by which
 * data file exists on disk:
 *
 *   Tier 1 — dedicated rich corpus:  data/curriculum/<subject-slug>-cdc-2024.json
 *            (CDC "chunk" schema: { meta, curriculum[] } — richer units/competences).
 *            Chemistry ships one today; adding another subject's *-cdc-2024.json
 *            automatically upgrades it with zero code changes.
 *   Tier 2 — shipped unit-format syllabus JSON (data/curriculum/**), resolved via
 *            loadJsonCurriculum() — the SAME resolver Curriculum Studio's
 *            resolveCurriculum() uses (so the subject→filename slug logic is shared).
 *   Tier 3 — neither exists (or has no usable content) → return null. Callers fall
 *            back to ungrounded generation and a Sentry warning records the gap.
 *
 * No embeddings required; this only builds the pre-seeded-corpus half of the RAG
 * context. Per-school uploaded-material retrieval is handled separately.
 */

import fs from 'fs'
import path from 'path'
import { loadJsonCurriculum, slugifySubject } from '@/lib/curriculum/jsonCurriculumLoader'
import { normalizeForm, searchCurriculumRecords } from '@/lib/curriculum/chemistry-cdc-2024'
import { formatCurriculumRecord } from '@/lib/curriculum/format-chunk'
import { captureWarning } from '@/lib/utils/logger'

const DATA_DIR = path.join(process.cwd(), 'data', 'curriculum')

/**
 * Subjects that share an authoritative corpus under a different syllabus name.
 * Keys are lowercase; values are the subject name whose slug owns the JSON file.
 */
const GROUNDING_SUBJECT_ALIASES = {
  accounts: 'Commerce',
  'principles of accounts': 'Commerce',
  'musical arts': 'Music',
  'musical arts education': 'Music',
  'home economics': 'Food and Nutrition',
  ict: 'Computer Studies',
  'information and communications technology': 'Computer Studies',
}

function resolveGroundingSubject(subject) {
  const raw = String(subject || '').trim()
  if (!raw) return raw
  const alias = GROUNDING_SUBJECT_ALIASES[raw.toLowerCase()]
  return alias || raw
}

/**
 * In-memory cache of resolved corpora keyed by (subject-slug, formOrGrade).
 * Avoids re-reading/parsing JSON from disk on every AI request.
 * @type {Map<string, ResolvedCurriculumCorpus | null>}
 */
const corpusCache = new Map()

/**
 * @typedef {Object} ResolvedCurriculumCorpus
 * @property {'cdc' | 'unit'} type
 * @property {string} subject
 * @property {string} slug
 * @property {string} formOrGrade
 * @property {number | null} form
 * @property {any} data
 */

function cacheKey(subject, formOrGrade) {
  return `${slugifySubject(subject)}::${String(formOrGrade ?? '')
    .trim()
    .toLowerCase()}`
}

function titleCase(subject) {
  return String(subject || '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** A unit only grounds usefully if it carries real syllabus detail. */
function unitHasContent(unit) {
  if (!unit) return false
  const buckets = [unit.topics, unit.outcomes, unit.activities, unit.assessment]
  return buckets.some((b) => Array.isArray(b) && b.some((x) => String(x || '').trim()))
}

/**
 * Resolve the pre-seeded CDC curriculum corpus for a subject/form.
 *
 * @param {string | null | undefined} subject
 * @param {string | number | null | undefined} formOrGrade
 * @returns {Promise<ResolvedCurriculumCorpus | null>}
 */
export async function resolveCurriculumContext(subject, formOrGrade) {
  const requested = String(subject || '').trim()
  if (!requested) return null
  const subj = resolveGroundingSubject(requested)

  const key = cacheKey(requested, formOrGrade)
  if (corpusCache.has(key)) return corpusCache.get(key)

  const slug = slugifySubject(subj)
  const form = normalizeForm(formOrGrade)
  const gradeArg = form ? `Form ${form}` : String(formOrGrade || '').trim()

  // Tier 1 — dedicated rich CDC corpus: data/curriculum/<slug>-cdc-2024.json
  const dedicatedPath = path.join(DATA_DIR, `${slug}-cdc-2024.json`)
  if (fs.existsSync(dedicatedPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dedicatedPath, 'utf8'))
      if (Array.isArray(data?.curriculum) && data.curriculum.length) {
        const corpus = { type: 'cdc', subject: subj, slug, formOrGrade: gradeArg, form, data }
        corpusCache.set(key, corpus)
        return corpus
      }
    } catch (err) {
      captureWarning('curriculum.corpus.parse_failed', {
        subject: subj,
        formOrGrade: gradeArg || String(formOrGrade ?? '') || null,
        filePath: dedicatedPath,
        message: err?.message || String(err),
      })
    }
  }

  // Tier 2 — shipped unit-format syllabus JSON via the shared loader.
  const loaded = loadJsonCurriculum(subj, gradeArg)
  if (loaded && Array.isArray(loaded.units) && loaded.units.some(unitHasContent)) {
    const corpus = { type: 'unit', subject: subj, slug, formOrGrade: gradeArg, form, data: loaded }
    corpusCache.set(key, corpus)
    return corpus
  }

  // Tier 3 — no usable grounding. Surface the gap so missing coverage is visible.
  captureWarning('curriculum.context.missing', {
    subject: requested,
    formOrGrade: gradeArg || String(formOrGrade ?? '') || null,
  })
  corpusCache.set(key, null)
  return null
}

/** Reset the resolver cache (test helper). */
export function __clearCurriculumContextCache() {
  corpusCache.clear()
}

// ---------------------------------------------------------------------------
// Block builders — turn a resolved corpus into a RAG context string + refs.
// Output shape/format matches the previous Chemistry block so downstream prompt
// templates need no changes.
// ---------------------------------------------------------------------------

function cdcSubjectLabel(meta, subject) {
  const m = String(meta?.title || '').match(/CDC\s+\d{4}\s+(.+?)\s+syllabus/i)
  if (m) return m[1].trim()
  return titleCase(subject)
}

function cdcAuthority(meta) {
  const first = String(meta?.source || '')
    .split(',')[0]
    .trim()
  return first || 'Ministry of Education'
}

function buildCdcBlock(corpus, topic, limit) {
  const data = corpus.data || {}
  const meta = data.meta || {}
  const records = searchCurriculumRecords(data.curriculum || [], {
    form: corpus.form,
    query: topic,
    limit,
  })
  if (!records.length) return { block: '', refs: [], enabled: true, records: [] }

  const subjectLabel = cdcSubjectLabel(meta, corpus.subject)
  const authority = cdcAuthority(meta)
  const materialId = `cdc-${corpus.slug}-2024`

  const block =
    `Official Zambia CDC 2024 ${subjectLabel} syllabus excerpts (${authority}). ` +
    'Cite as [CDC N] when used.\n\n' +
    records
      .map(
        (r, i) =>
          `[CDC ${i + 1}] Form ${r.form} — ${r.subtopic} (${r.id}):\n${formatCurriculumRecord(r, meta)}`
      )
      .join('\n\n')

  const refs = records.map((r, i) => ({
    ref: i + 1,
    chunkId: r.id,
    materialId,
    materialTitle: meta.title,
    subject: subjectLabel,
    chunkIndex: i,
    similarity: 1,
    excerpt: formatCurriculumRecord(r, meta).slice(0, 280),
    source: 'cdc-syllabus',
  }))

  return { block, refs, enabled: true, records, source: materialId, materialId }
}

function scoreUnit(unit, terms) {
  if (!terms.length) return 1
  const hay = [
    unit.title,
    ...(unit.topics || []),
    ...(unit.outcomes || []),
    ...(unit.activities || []),
  ]
    .join(' ')
    .toLowerCase()

  let score = 0
  for (const term of terms) {
    if (
      String(unit.title || '')
        .toLowerCase()
        .includes(term)
    )
      score += 3
    if ((unit.topics || []).some((t) => String(t).toLowerCase().includes(term))) score += 2
    if (hay.includes(term)) score += 1
  }
  return score
}

function formatUnitChunk(unit, index, subjectLabel, gradeLabel) {
  const lines = []
  const head = [subjectLabel, gradeLabel && `(${gradeLabel})`, `— ${unit.title}`]
    .filter(Boolean)
    .join(' ')
  lines.push(`[CDC ${index + 1}] ${head}:`)

  const topics = (unit.topics || []).map((t) => String(t).trim()).filter(Boolean)
  if (topics.length) lines.push(`Topics: ${topics.join('; ')}`)

  const outcomes = (unit.outcomes || []).map((o) => String(o).trim()).filter(Boolean)
  if (outcomes.length) {
    lines.push('Learning outcomes:')
    for (const o of outcomes) lines.push(`- ${o}`)
  }

  const activities = (unit.activities || []).map((a) => String(a).trim()).filter(Boolean)
  if (activities.length) {
    lines.push('Suggested activities:')
    for (const a of activities) lines.push(`- ${a}`)
  }

  const assessment = (unit.assessment || []).map((a) => String(a).trim()).filter(Boolean)
  if (assessment.length) lines.push(`Assessment: ${assessment.join(', ')}`)

  return lines.join('\n')
}

function unitExcerpt(unit) {
  const topics = (unit.topics || []).map((t) => String(t).trim()).filter(Boolean)
  const base = topics.length ? `${unit.title}: ${topics.join('; ')}` : unit.title
  return String(base || '').slice(0, 280)
}

function buildUnitBlock(corpus, topic, limit) {
  const loaded = corpus.data || {}
  const usableUnits = (loaded.units || []).filter(unitHasContent)
  if (!usableUnits.length) return { block: '', refs: [], enabled: true, records: [] }

  const q = String(topic || '')
    .toLowerCase()
    .trim()
  const terms = q.split(/\s+/).filter(Boolean)

  const ranked = usableUnits
    .map((unit, i) => ({ unit, i, score: scoreUnit(unit, terms) }))
    .filter((x) => (terms.length ? x.score > 0 : true))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)

  const selected = ranked.length ? ranked.map((x) => x.unit) : usableUnits.slice(0, limit)
  if (!selected.length) return { block: '', refs: [], enabled: true, records: [] }

  const subjectLabel = titleCase(loaded.subject || corpus.subject)
  const gradeLabel = corpus.formOrGrade || loaded.gradeOrForm || ''
  const materialId = `cdc-${corpus.slug}`

  const block =
    `Official Zambia CDC syllabus excerpts (${subjectLabel}). ` +
    'Cite as [CDC N] when used.\n\n' +
    selected.map((unit, i) => formatUnitChunk(unit, i, subjectLabel, gradeLabel)).join('\n\n')

  const refs = selected.map((unit, i) => ({
    ref: i + 1,
    chunkId: `${materialId}-${unit.unitNumber ?? i + 1}`,
    materialId,
    materialTitle: `Zambia CDC Syllabus — ${subjectLabel}`,
    subject: subjectLabel,
    chunkIndex: i,
    similarity: 1,
    excerpt: unitExcerpt(unit),
    source: 'cdc-syllabus',
  }))

  return { block, refs, enabled: true, records: selected, source: materialId, materialId }
}

/**
 * Build the RAG context block + citation refs from a resolved corpus.
 * Subject-agnostic: dedicated CDC corpora reuse the chemistry record parser;
 * unit-format syllabi use the generic unit formatter.
 *
 * @param {ResolvedCurriculumCorpus | null} corpus
 * @param {string | null | undefined} topic
 * @param {{ limit?: number }} [options]
 * @returns {{ block: string, refs: any[], enabled: boolean, records: any[], source?: string, materialId?: string }}
 */
export function buildCurriculumContextBlock(corpus, topic, options = {}) {
  if (!corpus) return { block: '', refs: [], enabled: false, records: [] }
  const limit = options.limit ?? 5
  if (corpus.type === 'cdc') return buildCdcBlock(corpus, topic, limit)
  return buildUnitBlock(corpus, topic, limit)
}
