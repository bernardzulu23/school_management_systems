/**
 * Eligible teaching weeks for scheme-based midterm / end-of-term tests.
 * Pool = teaching weeks strictly before the slot's test week range.
 */
import {
  endOfTermWeeksFromSchedule,
  midTermWeeksFromSchedule,
  weekKindFromRow,
} from '@/lib/teaching/testWeeks'

/** @typedef {'mid_term' | 'end_of_term'} SchemeTestSlot */

/**
 * @typedef {object} SchemeWeekTopicRow
 * @property {number} week
 * @property {string} [topic]
 * @property {string} [topicTitle]
 * @property {string} [topicKey]
 * @property {string} [weekType]
 * @property {number} [unitNumber]
 * @property {string} [unitTitle]
 * @property {string[]|string} [learningOutcomes]
 * @property {string[]|string} [teachingActivities]
 * @property {string[]|string} [assessmentMethods]
 * @property {string} [assessmentMethod]
 * @property {string[]|string} [resources]
 * @property {string} [notes]
 */

/**
 * @typedef {object} EligibleSchemeTopic
 * @property {number} week
 * @property {string} topic
 * @property {string} topicTitle
 * @property {string} topicKey
 * @property {number} [unitNumber]
 * @property {string} [unitTitle]
 * @property {string[]} learningOutcomes
 * @property {string[]} teachingActivities
 * @property {string[]} assessmentMethods
 */

function asStringList(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean)
  }
  const s = String(value || '').trim()
  if (!s) return []
  return s
    .split(/\n|;|•/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** @param {unknown} weeks */
export function normalizeSchemeWeekRows(weeks) {
  if (!Array.isArray(weeks)) return []
  return weeks
    .map((w, i) => {
      if (!w || typeof w !== 'object') return null
      const row = /** @type {Record<string, unknown>} */ (w)
      const week = Number(row.week ?? i + 1)
      return {
        week: Number.isFinite(week) && week > 0 ? week : i + 1,
        topic: row.topic != null ? String(row.topic) : undefined,
        topicTitle: row.topicTitle != null ? String(row.topicTitle) : undefined,
        topicKey: row.topicKey != null ? String(row.topicKey) : undefined,
        weekType: row.weekType != null ? String(row.weekType) : undefined,
        unitNumber:
          row.unitNumber != null && Number.isFinite(Number(row.unitNumber))
            ? Number(row.unitNumber)
            : undefined,
        unitTitle: row.unitTitle != null ? String(row.unitTitle) : undefined,
        learningOutcomes: /** @type {string[]|string|undefined} */ (row.learningOutcomes),
        teachingActivities: /** @type {string[]|string|undefined} */ (row.teachingActivities),
        assessmentMethods: /** @type {string[]|string|undefined} */ (row.assessmentMethods),
        assessmentMethod: row.assessmentMethod != null ? String(row.assessmentMethod) : undefined,
        resources: /** @type {string[]|string|undefined} */ (row.resources),
        notes: row.notes != null ? String(row.notes) : undefined,
      }
    })
    .filter(Boolean)
}

/**
 * First week number of the assessment slot (inclusive range start).
 * @param {SchemeTestSlot} slot
 * @param {{ midTermWeek?: number|null, midTermWeekEnd?: number|null, endOfTermWeek?: number|null, endOfTermWeekEnd?: number|null }|null|undefined} schedule
 */
export function slotCutoffWeek(slot, schedule) {
  if (slot === 'mid_term') {
    const mid = midTermWeeksFromSchedule(schedule)
    return mid.length ? Math.min(...mid) : null
  }
  const eot = endOfTermWeeksFromSchedule(schedule)
  return eot.length ? Math.min(...eot) : null
}

/** @param {SchemeWeekTopicRow} row */
function topicLabel(row) {
  return String(row.topicTitle || '').trim() || String(row.topic || '').trim() || `Week ${row.week}`
}

/** @param {SchemeWeekTopicRow} row */
function topicKeyFor(row) {
  const key = String(row.topicKey || '').trim()
  if (key) return key
  const label = topicLabel(row)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return label || `week-${row.week}`
}

/**
 * Teaching weeks with week number strictly less than the slot cutoff.
 * Excludes mid/EoT assessment weeks even if they appear before cutoff.
 * @param {{ weeks: unknown, schedule: object|null|undefined, slot: SchemeTestSlot }} params
 */
export function eligibleTopicsForSlot(params) {
  const slot = params.slot
  const schedule = params.schedule || null
  const rows = normalizeSchemeWeekRows(params.weeks)
  const cutoff = slotCutoffWeek(slot, schedule)

  if (cutoff == null) {
    return {
      slot,
      cutoffWeek: null,
      topics: [],
      warning:
        slot === 'mid_term'
          ? 'Mid-term week is not set on this scheme. Set a mid-term week in the scheme test schedule.'
          : 'End-of-term week is not set on this scheme. Set an end-of-term week in the scheme test schedule.',
    }
  }

  /** @type {EligibleSchemeTopic[]} */
  const topics = []
  for (const row of rows) {
    const kind = weekKindFromRow(row.week, row.weekType, schedule)
    if (kind !== 'teaching') continue
    if (row.week >= cutoff) continue

    const assessmentMethods = [
      ...asStringList(row.assessmentMethods),
      ...(row.assessmentMethod ? [row.assessmentMethod] : []),
    ]

    topics.push({
      week: row.week,
      topic: topicLabel(row),
      topicTitle: topicLabel(row),
      topicKey: topicKeyFor(row),
      unitNumber: row.unitNumber,
      unitTitle: row.unitTitle,
      learningOutcomes: asStringList(row.learningOutcomes),
      teachingActivities: asStringList(row.teachingActivities),
      assessmentMethods,
    })
  }

  topics.sort((a, b) => a.week - b.week)

  return {
    slot,
    cutoffWeek: cutoff,
    topics,
    warning:
      topics.length === 0
        ? `No teaching topics found before week ${cutoff}. Add teaching weeks to the scheme or adjust the test schedule.`
        : undefined,
  }
}

/**
 * Ensure every selected week/key is in the eligible pool.
 * @param {EligibleSchemeTopic[]} eligible
 * @param {number[]} selectedWeeks
 * @param {string[]} selectedTopicKeys
 */
export function assertSelectionsEligible(eligible, selectedWeeks, selectedTopicKeys) {
  const byWeek = new Map(eligible.map((t) => [t.week, t]))
  const byKey = new Map(eligible.map((t) => [t.topicKey, t]))
  /** @type {Map<string, EligibleSchemeTopic>} */
  const picked = new Map()

  for (const w of selectedWeeks) {
    const row = byWeek.get(Number(w))
    if (!row) {
      return { ok: false, error: `Week ${w} is not eligible for this test slot` }
    }
    picked.set(`${row.week}:${row.topicKey}`, row)
  }
  for (const key of selectedTopicKeys) {
    const k = String(key || '').trim()
    if (!k) continue
    const row = byKey.get(k)
    if (!row) {
      return { ok: false, error: `Topic "${k}" is not eligible for this test slot` }
    }
    picked.set(`${row.week}:${row.topicKey}`, row)
  }

  if (picked.size === 0) {
    return { ok: false, error: 'Select at least one eligible scheme topic' }
  }

  return { ok: true, selected: Array.from(picked.values()).sort((a, b) => a.week - b.week) }
}

/**
 * Prompt block grounded in scheme week content (not generic syllabus).
 * @param {EligibleSchemeTopic[]} topics
 */
export function buildSchemeContentBlock(topics) {
  const lines = ['SCHEME OF WORK — taught topics for this assessment (assess ONLY these):']
  for (const t of topics) {
    lines.push(`\nWeek ${t.week}: ${t.topicTitle}`)
    if (t.unitTitle) lines.push(`  Unit: ${t.unitTitle}`)
    if (t.learningOutcomes.length) {
      lines.push(`  Learning outcomes: ${t.learningOutcomes.join('; ')}`)
    }
    if (t.teachingActivities.length) {
      lines.push(`  Teaching activities: ${t.teachingActivities.join('; ')}`)
    }
    if (t.assessmentMethods.length) {
      lines.push(`  Scheme assessment methods: ${t.assessmentMethods.join('; ')}`)
    }
  }
  return lines.join('\n')
}

/**
 * Hard-gate contract helper: drop items that failed validation.
 * Generation never returns failing items to the teacher UI.
 * @param {Array<{ question: any, valid: boolean }>} candidates
 */
export function retainValidatedQuestions(candidates) {
  const list = Array.isArray(candidates) ? candidates : []
  const questions = []
  let rejectedCount = 0
  for (const c of list) {
    if (c?.valid && c.question) questions.push(c.question)
    else rejectedCount += 1
  }
  return { questions, rejectedCount }
}
