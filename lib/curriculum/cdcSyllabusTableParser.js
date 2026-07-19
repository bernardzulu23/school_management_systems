/**
 * Parse Zambia CDC Ordinary Level syllabus text (TOPIC / SUBTOPIC /
 * SPECIFIC COMPETENCES / LEARNING ACTIVITIES / EXPECTED STANDARD tables)
 * into Chemistry-compatible CDC chunk records and unit-format curriculum JSON.
 *
 * Does NOT fabricate content — only extracts what is present in the text.
 */

import { decodeCdcTextAuto, cleanCdcLine } from '@/lib/curriculum/cdcFontDecode'
import {
  extractSubjectFromFilename,
  normalizeKnownSubject,
  isValidCurriculumSubject,
} from '@/lib/curriculum/syllabusParsing'
import { slugifySubject } from '@/lib/curriculum/jsonCurriculumLoader'

/** @typedef {import('./types').CurriculumRecord} CurriculumRecord */

const TOPIC_RE = /^([1-4])\.(\d+)\.0\b(?:\s*[.\-–:]?\s*(.*))?$/i
const SUBTOPIC_RE = /^([1-4])\.(\d+)\.(\d+)\b(?:\s*[.\-–:]?\s*(.*))?$/i
const COMPETENCE_RE = /^([1-4])\.(\d+)\.(\d+)\.(\d+)\b(?:\s*[.\-–:]?\s*(.*))?$/i
const FORM_RE = /\bFORM\s*([1-4])\b/i
const ACTIVITY_RE = /^(?:[x×•●▪◦\-–—]|[\u2022\u25cf])\s*(.+)$/i
const STANDARD_RE =
  /\b(accordingly|correctly|appropriately|artfully|effectively|successfully|accurately)\s*\.?$/i
const BOILERPLATE_RE =
  /ministry\s*of\s*education|permanent\s+secretary|curriculum\s+development|acknowledgement|table\s+of\s+contents|isbn\s*\d|secondary\s+education\s+ordinary|key\s+competences\s+to\s+be\s+developed|suggested\s+teaching\s+methodolog|structure\s+of\s+the\s+syllabus|concepts?\s*$|sub[- ]?topics?\s*$|specific\s+competenc|learning\s+activit|expected\s+standard/i

/**
 * @param {string} text
 * @param {{ alreadyDecoded?: boolean, shift?: number | null, sample?: string }} [decodeOpts]
 * @returns {string[]}
 */
function prepareLines(text, decodeOpts = {}) {
  const { text: decoded } = decodeCdcTextAuto(text, decodeOpts)
  return decoded
    .split(/\r?\n/)
    .map(cleanCdcLine)
    .filter((l) => l.length > 1)
    .filter((l) => !/^page\s*\d+$/i.test(l))
    .filter((l) => !/^\d{1,3}$/.test(l))
}

/**
 * Join wrapped heading fragments: "1.1.1 Levels of Biological" + "Organisation"
 * @param {string[]} lines
 * @returns {string[]}
 */
function coalesceHeadings(lines) {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const isHeading = TOPIC_RE.test(line) || SUBTOPIC_RE.test(line) || COMPETENCE_RE.test(line)
    if (isHeading) {
      while (i + 1 < lines.length) {
        const next = lines[i + 1]
        if (
          TOPIC_RE.test(next) ||
          SUBTOPIC_RE.test(next) ||
          COMPETENCE_RE.test(next) ||
          ACTIVITY_RE.test(next) ||
          FORM_RE.test(next) ||
          STANDARD_RE.test(next) ||
          BOILERPLATE_RE.test(next) ||
          next.length > 100
        ) {
          break
        }
        // Short continuation of a split heading
        if (/^[A-Za-z(]/.test(next) && next.length < 80) {
          line = `${line} ${next}`.replace(/\s+/g, ' ')
          i++
          continue
        }
        break
      }
    }
    out.push(line)
  }
  return out
}

/**
 * @param {string} title
 * @returns {string[]}
 */
function keywordsFromTitle(title) {
  return String(title || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3)
    .slice(0, 12)
}

/**
 * Parse CDC syllabus plain text into curriculum records.
 * @param {string} rawText
 * @param {{
 *   subject?: string,
 *   filenameHint?: string,
 *   alreadyDecoded?: boolean,
 *   shift?: number | null,
 *   sample?: string,
 * }} [options]
 * @returns {{ subject: string, records: CurriculumRecord[], forms: number[], decode?: { shift: number, confidence: number } }}
 */
export function parseCdcSyllabusText(rawText, options = {}) {
  const subject =
    options.subject ||
    extractSubjectFromFilename(options.filenameHint || '') ||
    normalizeKnownSubject(options.filenameHint || '') ||
    'General'

  const decodeOpts = {
    alreadyDecoded: Boolean(options.alreadyDecoded),
    shift: options.shift,
    sample: options.sample,
  }
  const lines = coalesceHeadings(prepareLines(rawText, decodeOpts))
  /** @type {CurriculumRecord[]} */
  const records = []

  let form = 1
  let topicNumber = ''
  let topic = ''
  let subtopicNumber = ''
  let subtopic = ''
  /** @type {string[]} */
  let competences = []
  /** @type {string[]} */
  let activities = []
  /** @type {string} */
  let expectedStandard = ''
  let competenceCode = ''

  function flush() {
    if (!subtopicNumber || (!competences.length && !activities.length && !expectedStandard)) {
      competences = []
      activities = []
      expectedStandard = ''
      competenceCode = ''
      return
    }
    const formNum = Number(String(subtopicNumber).split('.')[0]) || form
    const topicIdx = Number(String(topicNumber).split('.')[1]) || 1
    const subIdx = Number(String(subtopicNumber).split('.')[2]) || records.length + 1
    const id = `F${formNum}-T${topicIdx}-S${subIdx}`
    // Avoid duplicate ids when multiple competence rows share a subtopic — append sequence
    const dupCount = records.filter((r) => r.id === id || r.id.startsWith(`${id}-`)).length
    const finalId = dupCount === 0 ? id : `${id}-${dupCount + 1}`

    records.push({
      id: finalId,
      form: formNum,
      topicNumber: topicNumber || `${formNum}.${topicIdx}`,
      topic: topic || `Topic ${topicNumber}`,
      subtopicNumber,
      subtopic: subtopic || `Subtopic ${subtopicNumber}`,
      specificCompetences: competences.length ? [...competences] : [],
      learningActivities: activities.length ? [...activities] : [],
      expectedStandard: expectedStandard || '',
      keywords: keywordsFromTitle(`${topic} ${subtopic}`),
      suggestedAssessmentTypes: ['short answer', 'practical assessment', 'discussion'],
    })

    competences = []
    activities = []
    expectedStandard = ''
    competenceCode = ''
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (BOILERPLATE_RE.test(line) && !COMPETENCE_RE.test(line) && !SUBTOPIC_RE.test(line)) {
      continue
    }

    const formMatch = line.match(/^FORM\s*([1-4])\b/i)
    if (formMatch && line.length < 20) {
      flush()
      form = Number(formMatch[1])
      continue
    }

    const topicMatch = line.match(TOPIC_RE)
    if (topicMatch) {
      flush()
      form = Number(topicMatch[1])
      topicNumber = `${topicMatch[1]}.${topicMatch[2]}`
      topic = cleanCdcLine(topicMatch[3] || '') || topic
      continue
    }

    const subMatch = line.match(SUBTOPIC_RE)
    if (subMatch && !COMPETENCE_RE.test(line)) {
      flush()
      form = Number(subMatch[1])
      topicNumber = `${subMatch[1]}.${subMatch[2]}`
      subtopicNumber = `${subMatch[1]}.${subMatch[2]}.${subMatch[3]}`
      subtopic = cleanCdcLine(subMatch[4] || '') || subtopic
      continue
    }

    const compMatch = line.match(COMPETENCE_RE)
    if (compMatch) {
      // New competence under same or new subtopic
      if (competences.length || activities.length || expectedStandard) {
        flush()
      }
      form = Number(compMatch[1])
      topicNumber = `${compMatch[1]}.${compMatch[2]}`
      subtopicNumber = `${compMatch[1]}.${compMatch[2]}.${compMatch[3]}`
      competenceCode = `${compMatch[1]}.${compMatch[2]}.${compMatch[3]}.${compMatch[4]}`
      const rest = cleanCdcLine(compMatch[5] || '')
      if (rest) competences.push(rest)
      else {
        // Competence text may be on the next line(s)
        let j = i + 1
        const parts = []
        while (j < lines.length) {
          const n = lines[j]
          if (
            TOPIC_RE.test(n) ||
            SUBTOPIC_RE.test(n) ||
            COMPETENCE_RE.test(n) ||
            ACTIVITY_RE.test(n) ||
            STANDARD_RE.test(n)
          )
            break
          if (BOILERPLATE_RE.test(n)) break
          parts.push(n)
          j++
          if (parts.join(' ').length > 160) break
        }
        if (parts.length) {
          competences.push(parts.join(' '))
          i = j - 1
        }
      }
      continue
    }

    const actMatch = line.match(ACTIVITY_RE)
    if (actMatch) {
      const act = cleanCdcLine(actMatch[1])
      if (act && act.length > 3 && !BOILERPLATE_RE.test(act)) activities.push(act)
      continue
    }

    if (STANDARD_RE.test(line) && line.length > 12 && line.length < 220) {
      expectedStandard = cleanCdcLine(line)
      continue
    }

    // Bare competence text without numbering (rare) — attach if we have a subtopic open
    if (
      subtopicNumber &&
      !competences.length &&
      /^(Demonstrate|Describe|Explain|Apply|Analyse|Analyze|Identify|Discuss|Evaluate|Show|Relate|Investigate|Illustrate|Categorise|Categorize|Compare|Design|Create|Perform|Use|Examine|Trace|Construct|Classify|Explore|Research|Determine|Practise|Practice)\b/i.test(
        line
      ) &&
      line.length < 180
    ) {
      competences.push(line)
    }
  }

  flush()

  const forms = [...new Set(records.map((r) => r.form))].sort((a, b) => a - b)
  return { subject, records, forms }
}

/**
 * Collapse CDC records into unit-format curriculum JSON (one unit per topic).
 * @param {{ subject: string, records: CurriculumRecord[], forms: number[] }} parsed
 * @param {{ source?: string, sourceFileBytes?: number, extractionNote?: string, sourceUrl?: string }} [meta]
 */
export function cdcRecordsToUnitCurriculum(parsed, meta = {}) {
  const byTopic = new Map()
  for (const r of parsed.records) {
    const key = `${r.form}::${r.topicNumber}::${r.topic}`
    if (!byTopic.has(key)) {
      byTopic.set(key, {
        form: r.form,
        topicNumber: r.topicNumber,
        title: `Form ${r.form}: ${r.topic}`,
        topics: [],
        learningOutcomes: [],
        suggestedActivities: [],
        assessmentMethods: [],
        resources: [],
      })
    }
    const u = byTopic.get(key)
    if (r.subtopic && !u.topics.includes(r.subtopic)) u.topics.push(r.subtopic)
    for (const c of r.specificCompetences || []) {
      if (c && !u.learningOutcomes.includes(c)) u.learningOutcomes.push(c)
    }
    for (const a of r.learningActivities || []) {
      if (a && !u.suggestedActivities.includes(a)) u.suggestedActivities.push(a)
    }
    if (r.expectedStandard && !u.assessmentMethods.includes(r.expectedStandard)) {
      u.assessmentMethods.push(r.expectedStandard)
    }
  }

  const units = Array.from(byTopic.values()).map((u, i) => ({
    unitNumber: i + 1,
    title: u.title,
    topics: u.topics,
    learningOutcomes: u.learningOutcomes,
    suggestedActivities: u.suggestedActivities,
    assessmentMethods: u.assessmentMethods,
    resources: u.resources,
  }))

  return {
    subject: parsed.subject,
    level: 'Form 1-4',
    gradesCovered: [8, 9, 10, 11],
    totalDuration: '4 years (Forms 1-4)',
    units,
    metadata: {
      source:
        meta.source || `${parsed.subject} Syllabus, Secondary Education Ordinary Level, Form 1-4`,
      authority: 'Curriculum Development Centre (CDC), Ministry of Education, Republic of Zambia',
      sourceUrl: meta.sourceUrl,
      sourceIndexUrl: 'https://www.edu.gov.zm/?page_id=1142',
      accessedAt: new Date().toISOString().slice(0, 10),
      sourceFileBytes: meta.sourceFileBytes,
      extractionNote:
        meta.extractionNote ||
        'Extracted from the official CDC PDF via per-file auto-detected character-code shift and table parsing (TOPIC / SUBTOPIC / SPECIFIC COMPETENCES / LEARNING ACTIVITIES / EXPECTED STANDARDS). Content is transcribed from the source, not paraphrased or generated.',
      curated: true,
      recordCount: parsed.records.length,
    },
  }
}

/**
 * Build a Chemistry-compatible dedicated CDC corpus file.
 * @param {{ subject: string, records: CurriculumRecord[], forms: number[] }} parsed
 * @param {{ source?: string, sourceFileBytes?: number, isbn?: string }} [meta]
 */
export function cdcRecordsToDedicatedCorpus(parsed, meta = {}) {
  const slug = slugifySubject(parsed.subject)
  return {
    meta: {
      title: `Zambia CDC 2024 ${parsed.subject} Syllabus — Structured RAG Dataset`,
      source: meta.source || 'Ministry of Education, Curriculum Development Centre, Lusaka, 2024',
      level: 'Secondary Education Ordinary Level',
      forms: parsed.forms.length ? parsed.forms : [1, 2, 3, 4],
      isbn: meta.isbn || undefined,
      purpose:
        'Structured curriculum data for AI-assisted quiz, lesson plan, and assessment generation. Each record maps to one embeddable chunk aligned to official CDC competences.',
      version: '1.0',
      generated: String(new Date().getFullYear()),
      subject: parsed.subject,
      slug,
      sourceFileBytes: meta.sourceFileBytes,
      extractionNote:
        meta.extractionNote ||
        'Extracted from the official CDC PDF via per-file auto-detected character-code shift and table parsing. Content is transcribed from the source, not fabricated.',
    },
    curriculum: parsed.records,
  }
}

export { isValidCurriculumSubject, slugifySubject }
