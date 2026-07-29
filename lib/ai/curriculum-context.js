/**
 * Generic two-tier CDC curriculum grounding for AI prompts across ALL subjects.
 *
 * No subject is special-cased by name. Grounding is resolved purely by which
 * data file exists on disk:
 *
 *   Tier 1 — dedicated rich corpus:  data/curriculum/<subject-slug>-cdc-2024.json
 *            or data/curriculum/primary/<subject-slug>-cdc-2024.json for Grades 1–7
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
import { findSubjectRegistryEntry } from '@/lib/ecz/eoc/subjectRegistry'

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
  'computer studies / ict': 'Computer Studies',
  'english (core)': 'English',
  'english language': 'English',
  'mathematics (core)': 'Mathematics',
  'mathematics i': 'Mathematics',
  'mathematics ii': 'Mathematics',
  'french language': 'French',
  'physical education and sport': 'Physical Education',
  'physical education': 'Physical Education',
  'literature in english': 'Literature in English',
  'biology (science)': 'Biology',
  'chemistry (science)': 'Chemistry',
  'physics (science)': 'Physics',
  'history (humanities)': 'History',
  'geography (humanities)': 'Geography',
  'civic education (humanities)': 'Civic Education',
  'religious education (humanities)': 'Religious Education',
  'art and design (arts)': 'Art and Design',
  'music (arts)': 'Music',
  agriculture: 'Agricultural Science',
  'agricultural science': 'Agricultural Science',
  'creative and technology studies': 'Technology Studies',
  'information technology study': 'Technology Studies',
  'information technology studies': 'Technology Studies',
  'technology studies': 'Technology Studies',
  'expressive arts': 'Expressive Arts',
  'expressive art': 'Expressive Arts',
}

function resolveGroundingSubject(subject) {
  const raw = String(subject || '').trim()
  if (!raw) return raw
  const lower = raw.toLowerCase()
  const alias = GROUNDING_SUBJECT_ALIASES[lower]
  if (alias) return alias
  // Strip trailing "(Core)" / "(Science)" style suffixes used by Story Weaver labels
  const stripped = raw.replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (stripped && stripped.toLowerCase() !== lower) {
    const strippedAlias = GROUNDING_SUBJECT_ALIASES[stripped.toLowerCase()]
    if (strippedAlias) return strippedAlias
    return stripped
  }
  return raw
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
 * @property {number | null} grade
 * @property {any} data
 */

function cacheKey(subject, formOrGrade) {
  return `${slugifySubject(subject)}::${String(formOrGrade ?? '')
    .trim()
    .toLowerCase()}`
}

/**
 * Preserve Grade N vs Form N for syllabus loaders.
 * Never rewrite "Grade 10" → "Form 10" (breaks unit JSON gradeMatches + CDC filters).
 * @param {string | number | null | undefined} formOrGrade
 * @returns {string}
 */
export function toCurriculumGradeArg(formOrGrade) {
  if (formOrGrade == null || formOrGrade === '') return ''
  if (typeof formOrGrade === 'number' && Number.isFinite(formOrGrade)) {
    return `Form ${formOrGrade}`
  }
  const raw = String(formOrGrade).trim()
  if (!raw) return ''
  const compact = raw.toLowerCase().replace(/\s+/g, '')
  const gradeTok = compact.match(/^grade(\d{1,2})$/)
  if (gradeTok) return `Grade ${Number(gradeTok[1])}`
  const formTok = compact.match(/^form(\d{1,2})$/)
  if (formTok) return `Form ${Number(formTok[1])}`
  if (/^grade\s*\d+/i.test(raw)) {
    const n = normalizeForm(raw)
    return n != null ? `Grade ${n}` : raw
  }
  if (/^form\s*\d+/i.test(raw)) {
    const n = normalizeForm(raw)
    return n != null ? `Form ${n}` : raw
  }
  const n = normalizeForm(raw)
  return n != null ? `Form ${n}` : raw
}

/**
 * Numeric form/grade used to filter CDC `curriculum[].form` rows.
 * Maps Zambian Grade 8–12 onto Form 1–4 for secondary CDC corpora.
 * Primary Grade 1–7 must NOT be treated as Form 1–7 (that emptied topic lists
 * for every secondary subject when the lesson planner defaulted to Grade 5).
 * @param {string | number | null | undefined} formOrGrade
 * @returns {number | null}
 */
export function toCdcFormNumber(formOrGrade) {
  const arg = toCurriculumGradeArg(formOrGrade)
  const grade = arg.match(/^Grade\s*(\d{1,2})$/i)
  if (grade) {
    const g = Number(grade[1])
    // Primary grades are not secondary CDC form numbers.
    if (g >= 1 && g <= 7) return null
    if (g === 8) return 1
    if (g === 9) return 2
    if (g === 10) return 3
    if (g === 11 || g === 12) return 4
    return g
  }
  return normalizeForm(arg)
}

/** True when the UI asked for a primary Grade 1–7 label. */
export function isPrimaryGradeLabel(formOrGrade) {
  return /^Grade\s*[1-7]\b/i.test(toCurriculumGradeArg(formOrGrade))
}

export function toPrimaryGradeNumber(formOrGrade) {
  const match = toCurriculumGradeArg(formOrGrade).match(/^Grade\s*([1-7])$/i)
  return match ? Number(match[1]) : null
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
  const gradeArg = toCurriculumGradeArg(formOrGrade)
  const form = toCdcFormNumber(formOrGrade)
  const grade = toPrimaryGradeNumber(formOrGrade)

  // Tier 1 — dedicated rich CDC corpus: data/curriculum/<slug>-cdc-2024.json
  const dedicatedPath =
    grade != null
      ? path.join(DATA_DIR, 'primary', `${slug}-cdc-2024.json`)
      : path.join(DATA_DIR, `${slug}-cdc-2024.json`)
  if (fs.existsSync(dedicatedPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dedicatedPath, 'utf8'))
      if (Array.isArray(data?.curriculum) && data.curriculum.length) {
        const corpus = {
          type: 'cdc',
          subject: subj,
          slug,
          formOrGrade: gradeArg,
          form,
          grade,
          data,
        }
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
  // Prefer registry form14Slug when canonical name does not match filename slug.
  const registry = findSubjectRegistryEntry(requested)
  const subjectTries = [subj]
  if (registry?.form14Slug) {
    const fromSlug = registry.form14Slug.replace(/-/g, ' ')
    if (!subjectTries.some((s) => s.toLowerCase() === fromSlug.toLowerCase())) {
      subjectTries.push(fromSlug)
    }
  }
  let loaded = null
  for (const trySubj of subjectTries) {
    loaded = loadJsonCurriculum(trySubj, gradeArg)
    if (loaded && Array.isArray(loaded.units) && loaded.units.some(unitHasContent)) break
    loaded = null
  }
  if (loaded && Array.isArray(loaded.units) && loaded.units.some(unitHasContent)) {
    const corpus = {
      type: 'unit',
      subject: loaded.subject || subj,
      slug: slugifySubject(loaded.subject || subj),
      formOrGrade: gradeArg,
      form,
      grade,
      data: loaded,
    }
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

/**
 * List practice/generation topics from the ingested curriculum corpus for a subject/form.
 * CDC corpora → subtopics (fallback: topic titles). Unit JSON → unit titles + unit.topics.
 * Returns [] when no corpus exists — callers may allow free-form topics in that case.
 *
 * @param {string | null | undefined} subject
 * @param {string | number | null | undefined} formOrGrade
 * @returns {Promise<string[]>}
 */
export async function listCurriculumTopics(subject, formOrGrade) {
  const tree = await listCurriculumTopicTree(subject, formOrGrade)
  const seen = new Set()
  const out = []
  for (const node of tree) {
    const title = String(node?.topic || '').trim()
    if (title) {
      const key = title.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push(title)
      }
    }
    // Flat list used by single-select UIs: include subtopics when topic labels are placeholders.
    for (const sub of node?.subtopics || []) {
      const s = String(sub || '').trim()
      if (!s) continue
      const key = s.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(s)
    }
  }
  return out
}

function isPlaceholderTopicTitle(title) {
  const t = String(title || '').trim()
  if (!t) return true
  // CDC English-style placeholders: "Topic 1.1", "Topic 2"
  if (/^Topic\s*\d+(?:\.\d+)*\.?$/i.test(t)) return true
  if (/^Unit\s*\d+(?:\.\d+)*\.?$/i.test(t)) return true
  return false
}

/**
 * Hierarchical topic → subtopics for lesson planner / quiz UIs.
 * @param {string | null | undefined} subject
 * @param {string | number | null | undefined} formOrGrade
 * @returns {Promise<Array<{ topic: string, subtopics: string[] }>>}
 */
export async function listCurriculumTopicTree(subject, formOrGrade) {
  const corpus = await resolveCurriculumContext(subject, formOrGrade)
  if (!corpus) return []

  // Secondary CDC corpora only carry Form 1–4 rows — primary Grade 1–7 has nothing to list.
  if (corpus.type === 'cdc' && isPrimaryGradeLabel(formOrGrade)) {
    const records = Array.isArray(corpus.data?.curriculum) ? corpus.data.curriculum : []
    const hasExplicitPrimary = records.some(
      (r) =>
        r?.grade != null ||
        String(r?.level || '')
          .toLowerCase()
          .includes('primary')
    )
    if (!hasExplicitPrimary) return []
  }

  const seenTopic = new Map()

  function usable(value) {
    const t = String(value || '')
      .replace(/^=+\s*/g, '')
      .replace(/\s*=+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!t || t.length < 3 || t.length > 120) return ''
    if (/^Form\s+\d+\s*:\s*Topic\s+\d/i.test(t)) return ''
    if (/^Subtopic\s+\d/i.test(t)) return ''
    if (/^Unit\s+\d+$/i.test(t)) return ''
    if (/\b(and|or|of|to|in|on|for|with|the|a|an)$/i.test(t)) return ''
    const letters = (t.match(/[A-Za-z]/g) || []).length
    if (letters < 3) return ''
    return t
  }

  function pushUnique(list, value) {
    let t = usable(value)
    if (!t) return
    const afterCode = t.match(/\d+(?:\.\d+)+\.?\s+(.+)$/)
    if (afterCode) {
      const tail = usable(afterCode[1])
      if (tail) t = tail
    }
    const key = t.toLowerCase()
    if (list._seen?.has(key)) return
    if (!list._seen) list._seen = new Set()
    list._seen.add(key)
    list.push(t)
  }

  function ensureNode(topicTitle) {
    const title = String(topicTitle || '').trim()
    if (!title) return null
    const key = title.toLowerCase()
    let node = seenTopic.get(key)
    if (!node) {
      node = { topic: title, subtopics: [] }
      node.subtopics._seen = new Set()
      seenTopic.set(key, node)
    }
    return node
  }

  if (corpus.type === 'cdc') {
    let records = Array.isArray(corpus.data?.curriculum) ? corpus.data.curriculum : []
    if (corpus.grade != null) {
      records = records.filter((r) => Number(r.grade) === Number(corpus.grade))
    } else if (corpus.form != null) {
      records = records.filter((r) => Number(r.form) === Number(corpus.form))
    }

    let placeholderHeavy = 0
    let meaningful = 0
    for (const r of records) {
      const topicTitle = String(r.topic || '').trim()
      if (!topicTitle) continue
      if (isPlaceholderTopicTitle(topicTitle)) placeholderHeavy += 1
      else meaningful += 1
    }
    const flattenPlaceholders = placeholderHeavy > 0 && meaningful === 0

    if (flattenPlaceholders) {
      // English-style CDC: topic labels are "Topic 1.1" — expose subtopics as the topic list.
      const flat = { topic: '', subtopics: [] }
      flat.subtopics._seen = new Set()
      for (const r of records) {
        pushUnique(flat.subtopics, r.subtopic)
        if (!flat.subtopics.length) pushUnique(flat.subtopics, r.topic)
      }
      delete flat.subtopics._seen
      return flat.subtopics.map((sub) => ({ topic: sub, subtopics: [] }))
    }

    for (const r of records) {
      const topicTitle = usable(r.topic) || String(r.topic || '').trim()
      if (!topicTitle || isPlaceholderTopicTitle(topicTitle)) continue
      const node = ensureNode(topicTitle)
      if (!node) continue
      pushUnique(node.subtopics, r.subtopic)
    }

    const out = [...seenTopic.values()].map((n) => {
      delete n.subtopics._seen
      return n
    })
    if (out.length) return out

    // Fallback: flat subtopics as topics
    const flatSubs = []
    flatSubs._seen = new Set()
    for (const r of records) pushUnique(flatSubs, r.subtopic)
    delete flatSubs._seen
    return flatSubs.map((sub) => ({ topic: sub, subtopics: [] }))
  }

  for (const unit of corpus.data?.units || []) {
    const title = String(unit.title || '').trim()
    if (!title || /^Form\s+\d+\s*:/i.test(title)) continue
    const node = ensureNode(title)
    if (!node) continue
    for (const t of unit.topics || []) pushUnique(node.subtopics, t)
  }

  return [...seenTopic.values()].map((n) => {
    delete n.subtopics._seen
    return n
  })
}

/**
 * Subtopics under a parent topic (empty when the parent is itself a leaf / flat entry).
 * @param {string | null | undefined} subject
 * @param {string | number | null | undefined} formOrGrade
 * @param {string | null | undefined} parentTopic
 * @returns {Promise<string[]>}
 */
export async function listCurriculumSubtopics(subject, formOrGrade, parentTopic) {
  const parent = String(parentTopic || '').trim()
  if (!parent) return []
  const tree = await listCurriculumTopicTree(subject, formOrGrade)
  const lower = parent.toLowerCase()
  const node = tree.find((n) => String(n.topic || '').toLowerCase() === lower)
  if (node) return Array.isArray(node.subtopics) ? node.subtopics : []
  // Fuzzy: parent contained in topic title or vice versa
  const fuzzy = tree.find((n) => {
    const t = String(n.topic || '').toLowerCase()
    return t.includes(lower) || lower.includes(t)
  })
  return fuzzy && Array.isArray(fuzzy.subtopics) ? fuzzy.subtopics : []
}

/**
 * When curriculum topics exist, require the requested topic to match one of them
 * (case-insensitive exact, or curriculum topic contains / is contained by the request).
 * When no topics exist, returns the trimmed topic unchanged unless `requireListed` is set.
 *
 * @param {string | null | undefined} subject
 * @param {string | number | null | undefined} formOrGrade
 * @param {string | null | undefined} topic
 * @param {{ required?: boolean, requireIfListed?: boolean, requireListed?: boolean }} [options]
 * @returns {Promise<string>}
 */
export async function assertCurriculumTopicAllowed(subject, formOrGrade, topic, options = {}) {
  const requested = String(topic || '').trim()
  const topics = await listCurriculumTopics(subject, formOrGrade)

  if (!topics.length) {
    if (options.requireListed) {
      throw new Error(
        `No syllabus topics found for ${subject || 'this subject'} (${formOrGrade || 'form'}). Select a subject and form with curriculum data.`
      )
    }
    if (options.required && !requested) {
      throw new Error('topic is required')
    }
    return requested
  }

  if (!requested) {
    if (options.required || options.requireIfListed || options.requireListed) {
      throw new Error('topic must be selected from the curriculum topic dropdown')
    }
    return ''
  }

  const lower = requested.toLowerCase()
  const exact = topics.find((t) => t.toLowerCase() === lower)
  if (exact) return exact

  const fuzzy = topics.find((t) => {
    const tl = t.toLowerCase()
    return tl.includes(lower) || lower.includes(tl)
  })
  if (fuzzy) return fuzzy

  throw new Error(
    `Topic "${requested}" is not in the curriculum for ${subject}. Choose a syllabus topic from the dropdown.`
  )
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
  let availableRecords = data.curriculum || []
  if (corpus.grade != null) {
    availableRecords = availableRecords.filter(
      (record) => Number(record.grade) === Number(corpus.grade)
    )
  }
  const records = searchCurriculumRecords(availableRecords, {
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
          `[CDC ${i + 1}] ${r.grade != null ? `Grade ${r.grade}` : `Form ${r.form}`} — ${
            r.subtopic
          } (${r.id}):\n${formatCurriculumRecord(r, meta)}`
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
