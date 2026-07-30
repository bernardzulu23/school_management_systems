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

const SECONDARY_SYNTAX = {
  topic: /^([1-4])\.(\d+)\.0\b(?:\s*[.\-–:]?\s*(.*))?$/i,
  subtopic: /^([1-4])\.(\d+)\.(\d+)(?!\.\d)\b(?:\s*[.\-–:]?\s*(.*))?$/i,
  competence: /^([1-4])\.(\d+)\.(\d+)\.(\d+)\b(?:\s*[.\-–:]?\s*(.*))?$/i,
  level: /\bFORM\s*([1-4])\b/i,
  heading: /^FORM\s*([1-4])\b/i,
}
const PRIMARY_SYNTAX = {
  topic: /^([1-7])\.(\d+)(?:\.0)?(?!\.\d)\b(?:\s*[.\-–:]?\s*(.*))?$/i,
  subtopic: /^([1-7])\.(\d+)\.(\d+)(?!\.\d)\b(?:\s*[.\-–:]?\s*(.*))?$/i,
  competence: /^([1-7])\.(\d+)\.(\d+)\.(\d+)(?!\d)(?:\s*[.\-–:]?\s*(.*))?$/i,
  level: /\bGRADE\s*([1-7])\b/i,
  heading: /^GRADE\s*([1-7])\b/i,
}
// ECE tables use 0.<age band>.<topic> numbering:
// 0.1 = ages 3–4 and 0.2 = ages 4–5. Capture the age-band component as
// group 1 so the existing deterministic table parser can retain its hierarchy.
const ECE_SYNTAX = {
  topic: /^0\.([12])\.(\d+)\.?(?!\d|\.\d)(?:\s*[.\-–:]?\s*(.*))?$/i,
  subtopic: /^0\.([12])\.(\d+)\.(\d+)\.?(?!\d|\.\d)(?:\s*[.\-–:]?\s*(.*))?$/i,
  competence: /^0\.([12])\.(\d+)\.(\d+)\.(\d+)\.?(?!\d)(?:\s*[.\-–:]?\s*(.*))?$/i,
  level: /\b([34])\s*[-–]\s*[45]\s+YEARS\b/i,
  heading: /^([34])\s*[-–]\s*[45]\s+YEARS\b/i,
}
const ACTIVITY_RE = /^(?:[x×•●▪◦\-–—\u0087\u0194]|[\u2022\u25cf])+\s*(.+)$/i
const ACTIVITY_MARKER_RE = /^(?:[x×•●▪◦\-–—\u0087\u0194]|[\u2022\u25cf])+$/i
const STANDARD_RE =
  /\b(accordingly|correctly|appropriately|artfully|effectively|successfully|accurately|properly|responsibly|skillfully|creatively|expressively)(?:\s+\w+){0,6}\s*\.?$/i
const ACTIVITY_GERUND_RE =
  /^(Identifying|Using|Applying|Performing|Displaying|Drawing|Painting|Mixing|Creating|Singing|Composing|Playing|Practising|Practicing|Exploring|Discussing|Observing|Imitating|Role[- ]?playing|Listening|Clapping|Dancing|Acting|Modelling|Modeling|Cutting|Folding|Colouring|Coloring|Sketching|Tracing|Making|Constructing|Designing|Reciting|Narrating|Dramatising|Dramatizing)\b/i
const BOILERPLATE_RE =
  /ministry\s*of\s*education|permanent\s+secretary|curriculum\s+development|acknowledgement|table\s+of\s+contents|isbn\s*\d|secondary\s+education\s+ordinary|key\s+competences\s+to\s+be\s+developed|suggested\s+teaching\s+methodolog|structure\s+of\s+the\s+syllabus|concepts?\s*$|sub[- ]?topics?\s*$|specific\s+competenc|learning\s+activit|expected\s+standard|expressive\s+arts\s+syllabus/i

/** Ordered Lower Primary omnibus learning-area anchors (body headings, not TOC alone). */
const LOWER_PRIMARY_LEARNING_AREAS = [
  {
    subject: 'English',
    learningArea: 'Literacy and Language',
    re: /^(?:A\.\s*)?ENGLISH\s+LANGUAGE\b/i,
    gradeRe: /^GRADE\s*([1-3])\s*[:.\-–]\s*ENGLISH\s+LANGUAGE\b/i,
  },
  {
    subject: 'Zambian Languages',
    learningArea: 'Literacy and Language',
    re: /^(?:B\.\s*)?ZAMBIAN\s+LANGUAGES\b/i,
    gradeRe: /^GRADE\s*([1-3])\s*[:.\-–]\s*ZAMBIAN\s+LANGUAGES\b/i,
  },
  {
    subject: 'Mathematics and Science',
    learningArea: 'Mathematics and Science',
    re: /^MATHEMATICS\s+AND\s+SCIENCE\b/i,
    gradeRe: /^GRADE\s*([1-3])\s*[:.\-–]\s*MATHEMATICS\s+AND\s+SCIENCE\b/i,
  },
  {
    subject: 'Creative and Technology Studies',
    learningArea: 'Creative and Technology Studies',
    re: /^CREATIVE\s+AND\s+TECHNOLOGY\s+STUDIES\b/i,
    gradeRe: /^GRADE\s*([1-3])\s*[:.\-–]\s*CREATIVE\s+AND\s+TECHNOLOGY\s+STUDIES\b/i,
  },
]

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
    .filter((l) => l.length > 1 || ACTIVITY_MARKER_RE.test(l))
    .filter((l) => !/^page\s*\d+$/i.test(l))
    .filter((l) => !/^\d{1,3}$/.test(l))
}

function coalesceBulletLines(lines, syntax) {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!ACTIVITY_MARKER_RE.test(line)) {
      out.push(line)
      continue
    }

    // Primary PDFs often emit a bullet column of bare markers, then the activity
    // text column afterwards. Skip consecutive empty markers and consume the
    // following prose until the next numbered heading / boilerplate row.
    while (i + 1 < lines.length && ACTIVITY_MARKER_RE.test(lines[i + 1])) i++

    const parts = []
    while (i + 1 < lines.length) {
      const next = lines[i + 1]
      if (
        ACTIVITY_MARKER_RE.test(next) ||
        syntax.topic.test(next) ||
        syntax.subtopic.test(next) ||
        syntax.competence.test(next) ||
        syntax.level.test(next) ||
        BOILERPLATE_RE.test(next)
      ) {
        break
      }
      parts.push(next)
      i++
      if (parts.join(' ').length > 900) break
    }

    if (!parts.length) continue

    let buffer = []
    const flushBuffer = () => {
      const text = cleanCdcLine(buffer.join(' '))
      buffer = []
      if (!text || text.length < 4) return
      if (STANDARD_RE.test(text) && /^[A-Z]/.test(text) && text.split(/\s+/).length >= 3) {
        out.push(text)
      } else {
        out.push(`• ${text}`)
      }
    }

    for (const part of parts) {
      const cleaned = cleanCdcLine(part)
      if (!cleaned) continue
      if (
        buffer.length &&
        (ACTIVITY_GERUND_RE.test(cleaned) ||
          (STANDARD_RE.test(cleaned) && /^[A-Z]/.test(cleaned) && cleaned.split(/\s+/).length >= 3))
      ) {
        flushBuffer()
      }
      buffer.push(cleaned)
    }
    flushBuffer()
  }
  return out
}

/**
 * Join wrapped heading fragments: "1.1.1 Levels of Biological" + "Organisation"
 * @param {string[]} lines
 * @returns {string[]}
 */
function coalesceHeadings(lines, syntax) {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const isHeading =
      syntax.topic.test(line) || syntax.subtopic.test(line) || syntax.competence.test(line)
    if (isHeading) {
      while (i + 1 < lines.length) {
        const next = lines[i + 1]
        if (
          syntax.topic.test(next) ||
          syntax.subtopic.test(next) ||
          syntax.competence.test(next) ||
          ACTIVITY_RE.test(next) ||
          syntax.level.test(next) ||
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
 *   educationLevel?: 'ece' | 'primary' | 'secondary',
 * }} [options]
 * @returns {{ subject: string, records: CurriculumRecord[], forms: number[], grades: number[], ageBands?: string[], educationLevel: 'ece' | 'primary' | 'secondary' }}
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
  const educationLevel =
    options.educationLevel === 'ece'
      ? 'ece'
      : options.educationLevel === 'primary'
        ? 'primary'
        : 'secondary'
  const syntax =
    educationLevel === 'ece'
      ? ECE_SYNTAX
      : educationLevel === 'primary'
        ? PRIMARY_SYNTAX
        : SECONDARY_SYNTAX
  const lines = coalesceHeadings(
    coalesceBulletLines(prepareLines(rawText, decodeOpts), syntax),
    syntax
  )
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
  /** @type {Array<{ text: string, grade: number, nearRecordIndex: number }>} */
  const standardCandidates = []
  /** @type {Array<{ text: string, grade: number, nearRecordIndex: number }>} */
  const activityCandidates = []
  let competenceCode = ''
  let seenCurriculumTable = false
  const trackLearningAreas = Boolean(options.trackLearningAreas)
  let learningAreaIndex = -1
  let activeSubject = subject
  let activeLearningArea = null
  /** @type {number | null} */
  let activeGradeFromHeading = null
  let pendingGradeCodeMismatch = false

  function assignLearningArea(index) {
    const area = LOWER_PRIMARY_LEARNING_AREAS[index]
    if (!area) return
    learningAreaIndex = index
    activeSubject = area.subject
    activeLearningArea = area.learningArea
  }

  function clearOpenCurriculumState() {
    topicNumber = ''
    topic = ''
    subtopicNumber = ''
    subtopic = ''
    competences = []
    activities = []
    competenceCode = ''
    pendingGradeCodeMismatch = false
  }

  function maybeTrackLearningArea(line) {
    if (!trackLearningAreas) return false
    const next = learningAreaIndex + 1
    if (
      next < LOWER_PRIMARY_LEARNING_AREAS.length &&
      LOWER_PRIMARY_LEARNING_AREAS[next].re.test(line)
    ) {
      flush()
      clearOpenCurriculumState()
      assignLearningArea(next)
      return true
    }
    // TOC lists every area before body tables. Allow one restart at English
    // before any curriculum rows so body anchors remain authoritative.
    if (
      learningAreaIndex > 0 &&
      records.length === 0 &&
      LOWER_PRIMARY_LEARNING_AREAS[0].re.test(line)
    ) {
      flush()
      clearOpenCurriculumState()
      assignLearningArea(0)
      return true
    }
    return false
  }

  function maybeTrackGradeSubjectHeading(line) {
    if (!trackLearningAreas) return false
    for (let index = 0; index < LOWER_PRIMARY_LEARNING_AREAS.length; index++) {
      const area = LOWER_PRIMARY_LEARNING_AREAS[index]
      const match = line.match(area.gradeRe)
      if (!match) continue
      // Only advance forward (or stay on the current area). Never jump backward
      // into appendix schedules after Creative and Technology Studies.
      if (index < learningAreaIndex) return false
      flush()
      clearOpenCurriculumState()
      if (index > learningAreaIndex) assignLearningArea(index)
      activeGradeFromHeading = Number(match[1])
      form = activeGradeFromHeading
      return true
    }
    return false
  }

  function isIsolatedPrintedGradeSpike(printedGrade, fromIndex) {
    // Only the known Lower Primary Mathematics anomaly reprints a short Grade-3
    // burst inside an active Grade-2 heading. Never remap Grade 4+ stray rows.
    if (activeGradeFromHeading !== 2 || printedGrade !== 3) {
      return false
    }
    let spikedRun = 0
    let numberedSeen = 0
    for (let j = fromIndex + 1; j < Math.min(lines.length, fromIndex + 80); j++) {
      const next = lines[j]
      if (maybeTrackLearningAreaLine(next) || maybeTrackGradeSubjectHeadingLine(next)) {
        return false
      }
      const numbered =
        next.match(syntax.competence) || next.match(syntax.subtopic) || next.match(syntax.topic)
      if (!numbered) continue
      numberedSeen += 1
      const nextPrinted = Number(numbered[1])
      if (nextPrinted === printedGrade) {
        spikedRun += 1
        if (spikedRun > 4 || numberedSeen > 8) return false
        continue
      }
      return nextPrinted === activeGradeFromHeading && spikedRun <= 4 && numberedSeen <= 8
    }
    return false
  }

  function maybeTrackLearningAreaLine(line) {
    if (!trackLearningAreas) return false
    const next = learningAreaIndex + 1
    if (
      next < LOWER_PRIMARY_LEARNING_AREAS.length &&
      LOWER_PRIMARY_LEARNING_AREAS[next].re.test(line)
    ) {
      return true
    }
    return (
      learningAreaIndex > 0 && records.length === 0 && LOWER_PRIMARY_LEARNING_AREAS[0].re.test(line)
    )
  }

  function maybeTrackGradeSubjectHeadingLine(line) {
    if (!trackLearningAreas) return false
    return LOWER_PRIMARY_LEARNING_AREAS.some((area, index) => {
      if (index < learningAreaIndex) return false
      return area.gradeRe.test(line)
    })
  }

  function effectivePrimaryGrade(printedGrade, fromIndex = -1) {
    if (!trackLearningAreas || !Number.isFinite(printedGrade)) {
      pendingGradeCodeMismatch = false
      return printedGrade
    }
    if (isIsolatedPrintedGradeSpike(printedGrade, fromIndex)) {
      pendingGradeCodeMismatch = true
      return activeGradeFromHeading
    }
    // Normal progression: printed codes are authoritative and keep heading state in sync.
    activeGradeFromHeading = printedGrade
    pendingGradeCodeMismatch = false
    return printedGrade
  }

  function isLearningActivityText(text) {
    const value = cleanCdcLine(text)
    if (!value || value.length < 6 || value.length > 220) return false
    if (BOILERPLATE_RE.test(value)) return false
    if (
      /^(Ability to|Respect|Complement|Participate|Test hypothesis|Break-down|Breakdown|Ask for|Express one|Solve problems|Set ¿nancial|Understand basic)\b/i.test(
        value
      )
    ) {
      return false
    }
    return ACTIVITY_GERUND_RE.test(value)
  }

  function queueActivityCandidate(text) {
    if (!seenCurriculumTable || !isLearningActivityText(text)) return
    activityCandidates.push({
      text: cleanCdcLine(text),
      grade: form,
      nearRecordIndex: Math.max(0, records.length - 1),
    })
  }

  function flush() {
    if (!subtopicNumber || (!competences.length && !activities.length)) {
      for (const act of activities) queueActivityCandidate(act)
      competences = []
      activities = []
      competenceCode = ''
      pendingGradeCodeMismatch = false
      return
    }
    const printedGrade = Number(String(subtopicNumber).split('.')[0]) || form
    const formNum = form || printedGrade
    const topicIdx = Number(String(topicNumber).split('.')[1]) || 1
    const subIdx = Number(String(subtopicNumber).split('.')[2]) || records.length + 1
    const levelPrefix = educationLevel === 'ece' ? 'E' : educationLevel === 'primary' ? 'G' : 'F'
    const id = `${levelPrefix}${formNum}-T${topicIdx}-S${subIdx}`
    // Avoid duplicate ids when multiple competence rows share a subtopic — append sequence
    const dupCount = records.filter((r) => r.id === id || r.id.startsWith(`${id}-`)).length
    const finalId = dupCount === 0 ? id : `${id}-${dupCount + 1}`

    const record = {
      id: finalId,
      form: formNum,
      // Preserve the printed topic/subtopic codes even when the active grade
      // heading disagrees (Lower Primary Math/Science source anomaly).
      topicNumber: topicNumber || `${printedGrade}.${topicIdx}`,
      topic: topic || `Topic ${topicNumber}`,
      subtopicNumber,
      subtopic: subtopic || `Subtopic ${subtopicNumber}`,
      specificCompetences: competences.length ? [...competences] : [],
      learningActivities: activities.length ? [...activities] : [],
      expectedStandard: '',
      keywords: keywordsFromTitle(`${topic} ${subtopic}`),
      suggestedAssessmentTypes: ['short answer', 'practical assessment', 'discussion'],
    }
    if (trackLearningAreas && activeSubject) {
      record.subject = activeSubject
      if (activeLearningArea) record.learningArea = activeLearningArea
    }
    if (competenceCode) record.sourceCompetenceCode = competenceCode
    if (pendingGradeCodeMismatch) record.gradeCodeMismatch = true
    if (educationLevel === 'primary') {
      record.grade = formNum
      record.level = 'primary'
    } else if (educationLevel === 'ece') {
      record.level = 'ece'
      record.ageBand = formNum === 1 ? '3-4 years' : '4-5 years'
    }
    records.push(record)

    competences = []
    activities = []
    competenceCode = ''
    pendingGradeCodeMismatch = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (maybeTrackLearningArea(line)) continue
    if (maybeTrackGradeSubjectHeading(line)) continue
    if (BOILERPLATE_RE.test(line) && !syntax.competence.test(line) && !syntax.subtopic.test(line)) {
      continue
    }

    const formMatch = line.match(syntax.heading)
    if (formMatch && line.length < 20) {
      flush()
      form = educationLevel === 'ece' ? (Number(formMatch[1]) === 3 ? 1 : 2) : Number(formMatch[1])
      if (trackLearningAreas) activeGradeFromHeading = form
      continue
    }

    const topicMatch = line.match(syntax.topic)
    if (topicMatch) {
      flush()
      seenCurriculumTable = true
      const printedGrade = Number(topicMatch[1])
      form = trackLearningAreas ? effectivePrimaryGrade(printedGrade, i) : printedGrade
      topicNumber = `${topicMatch[1]}.${topicMatch[2]}`
      topic = cleanCdcLine(topicMatch[3] || '') || topic
      continue
    }

    const subMatch = line.match(syntax.subtopic)
    if (subMatch && !syntax.competence.test(line)) {
      const nextSubtopicNumber = `${subMatch[1]}.${subMatch[2]}.${subMatch[3]}`
      const nextText = cleanCdcLine(subMatch[4] || '')
      // A small number of primary source rows repeat the three-part subtopic
      // code where the four-part competence code was intended (for example,
      // 5.2.1 followed by 5.2.1 "Format a word document"). Preserve the source
      // text as a competence without inventing a missing code segment.
      if (nextSubtopicNumber === subtopicNumber && subtopic && nextText) {
        if (competences.length || activities.length) flush()
        competences.push(nextText)
        continue
      }
      flush()
      seenCurriculumTable = true
      const printedGrade = Number(subMatch[1])
      form = trackLearningAreas ? effectivePrimaryGrade(printedGrade, i) : printedGrade
      topicNumber = `${subMatch[1]}.${subMatch[2]}`
      subtopicNumber = nextSubtopicNumber
      subtopic = nextText || subtopic
      continue
    }

    const compMatch = line.match(syntax.competence)
    if (compMatch) {
      // New competence under same or new subtopic
      if (competences.length || activities.length) {
        flush()
      }
      seenCurriculumTable = true
      const printedGrade = Number(compMatch[1])
      form = trackLearningAreas ? effectivePrimaryGrade(printedGrade, i) : printedGrade
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
            syntax.topic.test(n) ||
            syntax.subtopic.test(n) ||
            syntax.competence.test(n) ||
            ACTIVITY_RE.test(n) ||
            (parts.length > 0 && STANDARD_RE.test(n))
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
      if (act && act.length > 3 && !BOILERPLATE_RE.test(act)) {
        if (subtopicNumber && (competences.length || activities.length)) {
          activities.push(act)
        } else {
          queueActivityCandidate(act)
        }
      }
      continue
    }

    if (STANDARD_RE.test(line) && line.length > 12 && line.length < 220) {
      if (seenCurriculumTable) {
        standardCandidates.push({
          text: cleanCdcLine(line),
          grade: form,
          nearRecordIndex: Math.max(0, records.length - 1),
        })
      }
      continue
    }

    // Jumbled primary tables often leave activity gerunds without a bullet after
    // the competence rows have already closed. Keep them for semantic attach.
    if (
      ACTIVITY_GERUND_RE.test(line) &&
      line.length > 8 &&
      line.length < 220 &&
      !syntax.topic.test(line) &&
      !syntax.subtopic.test(line) &&
      !syntax.competence.test(line)
    ) {
      if (subtopicNumber && competences.length) {
        activities.push(line)
      } else {
        queueActivityCandidate(line)
      }
      continue
    }

    // Bare competence text without numbering (rare) — attach if we have a subtopic open
    if (
      subtopicNumber &&
      !competences.length &&
      /^(Demonstrate|Describe|Explain|Apply|Analyse|Analyze|Identify|Discuss|Evaluate|Show|Relate|Investigate|Illustrate|Categorise|Categorize|Compare|Design|Create|Perform|Use|Examine|Trace|Construct|Classify|Explore|Research|Determine|Practise|Practice|Compose|Draw|Paint|Sing|Dance|Act)\b/i.test(
        line
      ) &&
      line.length < 180
    ) {
      competences.push(line)
    }
  }

  flush()

  // PDF table extraction can emit the Expected Standard column after the next
  // row has already started. Assign each transcribed standard to the record it
  // matches semantically instead of trusting extraction order.
  const stopWords = new Set([
    'accordingly',
    'accurately',
    'appropriately',
    'correctly',
    'effectively',
    'properly',
    'successfully',
    'skillfully',
    'creatively',
    'expressively',
    'the',
    'and',
    'with',
    'using',
  ])
  const terms = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/¿/g, 'fi')
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2 && !stopWords.has(term))
      .map((term) => term.replace(/(ingly|edly|ing|ed|es|s)$/i, '').replace(/i$/i, 'y'))
      .filter((term) => term.length > 2)

  function bestRecordIndex(
    candidate,
    { exclusive = false, used = null, minScore = 10, minOverlap = 1 } = {}
  ) {
    const candidateTerms = new Set(terms(candidate.text))
    let bestIndex = -1
    let bestScore = -Infinity
    let bestOverlap = 0
    for (let index = 0; index < records.length; index++) {
      if (exclusive && used?.has(index)) continue
      const sameGrade = Number(records[index].form) === Number(candidate.grade)
      const recordTerms = new Set(
        terms(
          `${records[index].topic} ${records[index].subtopic} ${(
            records[index].specificCompetences || []
          ).join(' ')}`
        )
      )
      let overlap = 0
      for (const term of candidateTerms) {
        if (recordTerms.has(term)) overlap++
      }
      if (overlap < minOverlap) continue
      const distance = Math.abs(index - candidate.nearRecordIndex)
      const score = overlap * 20 - Math.min(distance, 20) + (sameGrade ? 5 : -8)
      if (score > bestScore) {
        bestScore = score
        bestOverlap = overlap
        bestIndex = index
      }
    }
    return bestScore >= minScore && bestOverlap >= minOverlap ? bestIndex : -1
  }

  const assignedStandards = new Set()
  for (const candidate of standardCandidates) {
    const bestIndex = bestRecordIndex(candidate, {
      exclusive: true,
      used: assignedStandards,
      minScore: 10,
      minOverlap: 1,
    })
    if (bestIndex >= 0) {
      records[bestIndex].expectedStandard = candidate.text
      assignedStandards.add(bestIndex)
    }
  }

  for (const candidate of activityCandidates) {
    const bestIndex = bestRecordIndex(candidate, { minScore: 18, minOverlap: 2 })
    if (bestIndex < 0) continue
    const list = records[bestIndex].learningActivities
    if (!list.some((item) => item.toLowerCase() === candidate.text.toLowerCase())) {
      list.push(candidate.text)
    }
  }

  // Recompute keywords after activities/standards may have been attached.
  for (const record of records) {
    record.keywords = keywordsFromTitle(
      `${record.topic} ${record.subtopic} ${(record.specificCompetences || []).join(' ')}`
    )
  }

  const forms = [...new Set(records.map((r) => r.form))].sort((a, b) => a - b)
  return {
    subject,
    records,
    forms: educationLevel === 'secondary' ? forms : [],
    grades: educationLevel === 'primary' ? forms : [],
    ageBands:
      educationLevel === 'ece'
        ? forms.map((band) => (band === 1 ? '3-4 years' : '4-5 years'))
        : undefined,
    educationLevel,
  }
}

/**
 * Collapse CDC records into unit-format curriculum JSON (one unit per topic).
 * @param {{ subject: string, records: CurriculumRecord[], forms: number[] }} parsed
 * @param {{ source?: string, sourceFileBytes?: number, extractionNote?: string, sourceUrl?: string }} [meta]
 */
export function cdcRecordsToUnitCurriculum(parsed, meta = {}) {
  const levelLabel = (value) => {
    if (parsed.educationLevel === 'ece') {
      return value === 1 ? 'ECE 3–4 years' : 'ECE 4–5 years'
    }
    return `${parsed.educationLevel === 'primary' ? 'Grade' : 'Form'} ${value}`
  }
  const byTopic = new Map()
  for (const r of parsed.records) {
    const key = `${r.form}::${r.topicNumber}::${r.topic}`
    if (!byTopic.has(key)) {
      byTopic.set(key, {
        form: r.form,
        topicNumber: r.topicNumber,
        title: `${levelLabel(r.form)}: ${r.topic}`,
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

  const levels =
    parsed.educationLevel === 'ece'
      ? [...new Set(parsed.records.map((record) => record.form))]
      : parsed.educationLevel === 'primary'
        ? parsed.grades
        : parsed.forms
  const minLevel = levels.length ? Math.min(...levels) : parsed.educationLevel === 'primary' ? 1 : 1
  const maxLevel = levels.length ? Math.max(...levels) : parsed.educationLevel === 'primary' ? 7 : 4
  const label = parsed.educationLevel === 'primary' ? 'Grade' : 'Form'
  const isEce = parsed.educationLevel === 'ece'

  return {
    subject: parsed.subject,
    level: isEce ? 'ECE Ages 3–5' : `${label} ${minLevel}-${maxLevel}`,
    gradesCovered:
      parsed.educationLevel === 'primary'
        ? levels
        : isEce
          ? []
          : levels.map((form) => Math.min(12, form + 7)),
    ageBands: isEce ? parsed.ageBands : undefined,
    totalDuration: isEce
      ? '2 age bands (3–4 and 4–5 years)'
      : `${Math.max(1, maxLevel - minLevel + 1)} years (${label}s ${minLevel}-${maxLevel})`,
    units,
    metadata: {
      source:
        meta.source ||
        `${parsed.subject} Syllabus, ${
          parsed.educationLevel === 'ece'
            ? 'Early Childhood Education, Ages 3–5'
            : parsed.educationLevel === 'primary'
              ? `Primary Education, Grades ${minLevel}-${maxLevel}`
              : 'Secondary Education Ordinary Level, Form 1-4'
        }`,
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
      level:
        parsed.educationLevel === 'ece'
          ? 'Early Childhood Education'
          : parsed.educationLevel === 'primary'
            ? 'Primary Education'
            : 'Secondary Education Ordinary Level',
      forms: parsed.forms.length ? parsed.forms : undefined,
      grades: parsed.grades?.length ? parsed.grades : undefined,
      ageBands: parsed.ageBands?.length ? parsed.ageBands : undefined,
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
