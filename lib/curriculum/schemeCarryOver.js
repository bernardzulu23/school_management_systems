/**
 * Carry unfinished scheme topics from a previous term into a new term.
 */
import { prisma } from '@/lib/prisma'
import { parseTermNumber } from '@/lib/teaching/performanceSummary'
import { testWeekSetFromSchedule, weekKindFromRow } from '@/lib/teaching/testWeeks'

/** @param {string|number} term @param {number} year */
export function previousTermRef(term, year) {
  const t = parseTermNumber(term)
  const y = Number(year) || new Date().getFullYear()
  if (t <= 1) return { term: 'Term 3', year: y - 1, termNumber: 3 }
  return { term: `Term ${t - 1}`, year: y, termNumber: t - 1 }
}

function asStringArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

/** Parse full week rows (including outcomes/activities) from SchemeOfWork.weeks JSON. */
export function parseSchemeWeekRows(weeks) {
  if (!Array.isArray(weeks)) return []
  return weeks
    .map((w, i) => {
      if (!w || typeof w !== 'object') return null
      const row = /** @type {Record<string, unknown>} */ (w)
      const week = Number(row.week ?? i + 1)
      return {
        week: Number.isFinite(week) ? week : i + 1,
        topic: row.topic != null ? String(row.topic) : '',
        weekType: row.weekType != null ? String(row.weekType) : undefined,
        topicKey: row.topicKey != null ? String(row.topicKey) : undefined,
        unitNumber:
          row.unitNumber != null && Number.isFinite(Number(row.unitNumber))
            ? Number(row.unitNumber)
            : undefined,
        unitTitle: row.unitTitle != null ? String(row.unitTitle) : undefined,
        topicTitle: row.topicTitle != null ? String(row.topicTitle) : undefined,
        learningOutcomes: asStringArray(row.learningOutcomes),
        teachingActivities: asStringArray(row.teachingActivities),
        assessmentMethod: row.assessmentMethod != null ? String(row.assessmentMethod) : '',
        assessmentMethods: asStringArray(row.assessmentMethods),
        resources: asStringArray(row.resources),
        notes: row.notes != null ? String(row.notes) : '',
        teacherNotes: row.teacherNotes != null ? String(row.teacherNotes) : '',
        homeworkTask: row.homeworkTask != null ? String(row.homeworkTask) : '',
      }
    })
    .filter(Boolean)
}

/**
 * Teaching weeks that were not marked complete on the previous scheme.
 * If no progress rows exist, all teaching weeks are candidates (common for unfinished terms).
 */
export function unfinishedTeachingWeeks(scheme, progressRows = []) {
  const schedule = scheme?.testSchedule || null
  const weeks = parseSchemeWeekRows(scheme?.weeks)
  const completed = new Set(
    (progressRows || [])
      .filter((p) => p?.completed)
      .map((p) => Number(p.weekNumber))
      .filter((n) => Number.isFinite(n))
  )
  const testSet = testWeekSetFromSchedule(schedule)
  const out = []
  for (const w of weeks) {
    const kind = weekKindFromRow(w.week, w.weekType, schedule)
    if (kind !== 'teaching' || testSet.has(w.week)) continue
    if (completed.has(w.week)) continue
    if (!String(w.topic || '').trim()) continue
    out.push(w)
  }
  return out
}

/**
 * Deduplicate by topicKey (preferred) or normalized topic title.
 */
export function dedupeCarryOverTopics(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows || []) {
    const key =
      String(row.topicKey || '').trim() ||
      String(row.topic || '')
        .trim()
        .toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

/**
 * Load unfinished teaching topics from the teacher's previous-term scheme.
 */
export async function loadCarryOverCandidates({
  schoolId,
  teacherId,
  subject,
  gradeOrForm,
  term,
  year,
}) {
  const prev = previousTermRef(term, year)
  const grade = String(gradeOrForm || '').trim()
  const subj = String(subject || '').trim()

  const scheme = await prisma.schemeOfWork.findFirst({
    where: {
      schoolId: String(schoolId),
      teacherId: String(teacherId),
      year: prev.year,
      term: prev.term,
      subject: { equals: subj, mode: 'insensitive' },
      gradeOrForm: { equals: grade, mode: 'insensitive' },
    },
    include: {
      progress: { select: { weekNumber: true, completed: true, topicName: true } },
      testSchedule: {
        select: {
          midTermWeek: true,
          midTermWeekEnd: true,
          endOfTermWeek: true,
          endOfTermWeekEnd: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!scheme) {
    return {
      previousTerm: prev,
      sourceSchemeId: null,
      topics: [],
      message: `No saved scheme found for ${subj} ${grade} · ${prev.term} ${prev.year}`,
    }
  }

  const unfinished = dedupeCarryOverTopics(unfinishedTeachingWeeks(scheme, scheme.progress))
  const topics = unfinished.map((w, i) => ({
    id: String(w.topicKey || `carry-${scheme.id}-w${w.week}-${i}`),
    topicKey: w.topicKey || null,
    topic: w.topic,
    unitTitle: w.unitTitle || null,
    topicTitle: w.topicTitle || null,
    week: w.week,
    learningOutcomes: w.learningOutcomes,
    teachingActivities: w.teachingActivities,
    assessmentMethod: w.assessmentMethod,
    assessmentMethods: w.assessmentMethods,
    resources: w.resources,
    notes: w.notes,
    homeworkTask: w.homeworkTask,
  }))

  return {
    previousTerm: prev,
    sourceSchemeId: scheme.id,
    sourceScheme: {
      id: scheme.id,
      term: scheme.term,
      year: scheme.year,
      subject: scheme.subject,
      gradeOrForm: scheme.gradeOrForm,
    },
    topics,
    message:
      topics.length === 0
        ? `All teaching weeks in ${prev.term} ${prev.year} were marked complete`
        : `${topics.length} unfinished topic(s) from ${prev.term} ${prev.year}`,
  }
}

/**
 * Convert selected carry-over topics into curriculum units placed at the front of the scheme.
 */
export function carryOverTopicsToUnits(topics = []) {
  return (topics || []).map((t, i) => {
    const title = String(t.unitTitle || t.topicTitle || t.topic || `Carry-over ${i + 1}`).trim()
    const topicLabel = String(t.topicTitle || t.topic || title).trim()
    const outcomes = asStringArray(t.learningOutcomes)
    const activities = asStringArray(t.teachingActivities)
    const resources = asStringArray(t.resources)
    const assessment = asStringArray(t.assessmentMethods)
    if (t.assessmentMethod) assessment.unshift(String(t.assessmentMethod))
    return {
      title: `↩ ${title}`,
      topics: [topicLabel],
      topicKeys: t.topicKey ? [String(t.topicKey)] : [],
      outcomes: outcomes.length ? outcomes : [`Continue ${topicLabel} from previous term`],
      activities: activities.length
        ? activities
        : [`Review and complete ${topicLabel}`, 'Guided practice on unfinished work'],
      assessment: [...new Set(assessment)].slice(0, 5).length
        ? [...new Set(assessment)].slice(0, 5)
        : ['Formative check on carried-over work'],
      resources: resources.length ? resources : ['Previous term notes / scheme'],
      weekHint: 1,
      sortOrder: -1000 + i,
      unitNumber: 0,
      carryOver: true,
      notes: t.notes || `Carried from previous term (week ${t.week || '?'})`,
    }
  })
}
