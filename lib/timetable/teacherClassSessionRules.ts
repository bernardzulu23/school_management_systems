/**
 * Teacher↔class session rules (separate from CLASS_DOUBLE_BOOKED / time-overlap).
 *
 * Rule A — TEACHER_CLASS_SUBJECT_SPLIT:
 *   Same teacher+class+subject+day in more than one non-contiguous block.
 * Rule B — TEACHER_CLASS_RETURN_TOO_SOON:
 *   Same teacher+class+day with a different subject closer than minGapPeriods.
 *
 * Contiguous = abutting times (endTime === next startTime) OR adjacent period
 * numbers with no teaching gap (endPeriod + 1 === next startPeriod).
 *
 * Used by validateTimetable (audit) and canPlace / CP-SAT (generation) so
 * detection and prevention share one implementation.
 */

import { formatTimeWindow, parseTimeToMinutes } from './timeRangeOverlap'
import {
  DEFAULT_TEACHER_WORKLOAD_RULES,
  normalizeTeacherWorkloadRules,
  workloadRulesForSolverPayload,
  type TeacherWorkloadRulesConfig,
} from './teacherWorkloadRules'

export const TEACHER_CLASS_SUBJECT_SPLIT = 'TEACHER_CLASS_SUBJECT_SPLIT' as const
export const TEACHER_CLASS_RETURN_TOO_SOON = 'TEACHER_CLASS_RETURN_TOO_SOON' as const

export type TeacherClassSessionIssueType =
  | typeof TEACHER_CLASS_SUBJECT_SPLIT
  | typeof TEACHER_CLASS_RETURN_TOO_SOON

export type RuleSeverity = 'hard' | 'soft'

export type TeacherClassSessionRulesConfig = {
  /** Minimum free teaching periods between different-subject returns (Rule B). */
  minGapPeriods: number
  /** Default hard — non-contiguous same-subject repeat. */
  ruleASeverity: RuleSeverity
  /** Default soft — different-subject gap too short. */
  ruleBSeverity: RuleSeverity
}

export const DEFAULT_TEACHER_CLASS_SESSION_RULES: TeacherClassSessionRulesConfig = {
  minGapPeriods: 1,
  ruleASeverity: 'hard',
  ruleBSeverity: 'soft',
}

export type SessionFragment = {
  id: string
  teacherId: string
  classId: string
  subjectId: string
  dayOfWeek: string
  /** First teaching period (1-based). */
  startPeriod: number
  /** Last teaching period inclusive (1-based). */
  endPeriod: number
  startTime: string
  endTime: string
  teacherName?: string | null
  className?: string | null
  subjectName?: string | null
}

export type TeacherClassSessionIssue = {
  type: TeacherClassSessionIssueType
  severity: RuleSeverity
  message: string
  entityId?: string
  assignmentIds: string[]
  teacherId?: string
  classId?: string
  dayOfWeek?: string
  subjectIds?: string[]
}

function normalizeDay(day: string | null | undefined): string {
  return String(day || '')
    .trim()
    .toLowerCase()
}

function normalizeClock(t: string | null | undefined): string {
  return String(t || '')
    .trim()
    .slice(0, 5)
}

export function normalizeTeacherClassSessionRules(
  raw?: Partial<TeacherClassSessionRulesConfig> | null
): TeacherClassSessionRulesConfig {
  const minGap = Number(raw?.minGapPeriods)
  const ruleA = raw?.ruleASeverity === 'soft' ? 'soft' : 'hard'
  const ruleB = raw?.ruleBSeverity === 'hard' ? 'hard' : 'soft'
  return {
    minGapPeriods: Number.isFinite(minGap) && minGap >= 0 ? Math.floor(minGap) : 1,
    ruleASeverity: ruleA,
    ruleBSeverity: ruleB,
  }
}

export type SchedulingRulesConfig = TeacherClassSessionRulesConfig & TeacherWorkloadRulesConfig

export const DEFAULT_SCHEDULING_RULES: SchedulingRulesConfig = {
  ...DEFAULT_TEACHER_CLASS_SESSION_RULES,
  ...DEFAULT_TEACHER_WORKLOAD_RULES,
}

/** Parse schedulingRules JSON from TimetableConfig (or API body). */
export function parseSchedulingRulesJson(raw: unknown): SchedulingRulesConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SCHEDULING_RULES }
  const o = raw as Record<string, unknown>
  return {
    ...normalizeTeacherClassSessionRules({
      minGapPeriods: o.minGapPeriods as number | undefined,
      ruleASeverity: o.ruleASeverity as RuleSeverity | undefined,
      ruleBSeverity: o.ruleBSeverity as RuleSeverity | undefined,
    }),
    ...normalizeTeacherWorkloadRules({
      maxPeriodsPerDay: o.maxPeriodsPerDay as number | undefined,
      maxConsecutivePeriods: o.maxConsecutivePeriods as number | undefined,
      dayOverloadSeverity: o.dayOverloadSeverity as RuleSeverity | undefined,
      consecutiveSeverity: o.consecutiveSeverity as RuleSeverity | undefined,
      breakOverlapSeverity: o.breakOverlapSeverity as RuleSeverity | undefined,
    }),
  }
}

export function schedulingRulesToJson(
  rules: Partial<SchedulingRulesConfig>
): SchedulingRulesConfig {
  return parseSchedulingRulesJson(rules)
}

/** CP-SAT / payload-friendly serialisation of rules (session + workload). */
export function rulesForSolverPayload(rules: Partial<SchedulingRulesConfig> | null | undefined) {
  const n = parseSchedulingRulesJson(rules || {})
  return {
    minGapPeriods: n.minGapPeriods,
    enforceSubjectSplit: true,
    enforceReturnGap: true,
    ...workloadRulesForSolverPayload(n),
  }
}

/**
 * Build a fragment from a timetable assignment / entry-like object.
 */
export function fragmentFromAssignment(a: {
  id: string
  teacherId?: string | null
  classId?: string | null
  subjectId?: string | null
  dayOfWeek?: string | null
  period?: number | null
  periodNumber?: number | null
  consecutivePeriods?: number | null
  startTime?: string | null
  endTime?: string | null
  teacherName?: string | null
  className?: string | null
  subjectName?: string | null
  isBreak?: boolean
}): SessionFragment | null {
  if (!a || a.isBreak) return null
  const teacherId = String(a.teacherId || '').trim()
  const classId = String(a.classId || '').trim()
  const subjectId = String(a.subjectId || '').trim()
  const dayOfWeek = normalizeDay(a.dayOfWeek)
  if (!teacherId || !classId || !subjectId || !dayOfWeek) return null

  const startPeriod = Math.max(1, Number(a.periodNumber ?? a.period) || 1)
  const span = Math.max(1, Number(a.consecutivePeriods) || 1)
  const startTime = normalizeClock(a.startTime)
  const endTime = normalizeClock(a.endTime)
  if (!startTime || !endTime) return null

  return {
    id: String(a.id),
    teacherId,
    classId,
    subjectId,
    dayOfWeek,
    startPeriod,
    endPeriod: startPeriod + span - 1,
    startTime,
    endTime,
    teacherName: a.teacherName,
    className: a.className,
    subjectName: a.subjectName,
  }
}

/** Zero-gap contiguous: abutting clock times OR adjacent period numbers. */
export function fragmentsAreContiguous(earlier: SessionFragment, later: SessionFragment): boolean {
  if (earlier.dayOfWeek !== later.dayOfWeek) return false
  if (normalizeClock(earlier.endTime) === normalizeClock(later.startTime)) return true
  if (earlier.endPeriod + 1 === later.startPeriod) return true
  return false
}

function sortFragments(list: SessionFragment[]): SessionFragment[] {
  return [...list].sort((a, b) => {
    const ta = parseTimeToMinutes(a.startTime) ?? 0
    const tb = parseTimeToMinutes(b.startTime) ?? 0
    if (ta !== tb) return ta - tb
    if (a.startPeriod !== b.startPeriod) return a.startPeriod - b.startPeriod
    return String(a.id).localeCompare(String(b.id))
  })
}

type SessionBlock = {
  fragments: SessionFragment[]
  startPeriod: number
  endPeriod: number
  startTime: string
  endTime: string
  subjectId: string
  subjectName?: string | null
}

/** Collapse abutting / adjacent fragments into one session block. */
export function collapseContiguousBlocks(fragments: SessionFragment[]): SessionBlock[] {
  const sorted = sortFragments(fragments)
  if (!sorted.length) return []

  const blocks: SessionBlock[] = []
  let current: SessionFragment[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1]
    const next = sorted[i]
    if (fragmentsAreContiguous(prev, next)) {
      current.push(next)
    } else {
      blocks.push(blockFromFragments(current))
      current = [next]
    }
  }
  blocks.push(blockFromFragments(current))
  return blocks
}

function blockFromFragments(fragments: SessionFragment[]): SessionBlock {
  const first = fragments[0]
  const last = fragments[fragments.length - 1]
  return {
    fragments,
    startPeriod: Math.min(...fragments.map((f) => f.startPeriod)),
    endPeriod: Math.max(...fragments.map((f) => f.endPeriod)),
    startTime: first.startTime,
    endTime: last.endTime,
    subjectId: first.subjectId,
    subjectName: first.subjectName,
  }
}

/** Free teaching periods between end of earlier block and start of later. */
export function periodGapBetween(earlier: SessionBlock, later: SessionBlock): number {
  return later.startPeriod - earlier.endPeriod - 1
}

function labelTeacher(f: SessionFragment): string {
  return String(f.teacherName || '').trim() || 'Teacher'
}

function labelClass(f: SessionFragment): string {
  return String(f.className || '').trim() || 'class'
}

function labelSubject(f: SessionFragment | SessionBlock): string {
  return String(f.subjectName || '').trim() || 'a subject'
}

export function buildSubjectSplitMessage(input: {
  teacherName: string
  className: string
  subjectName: string
  dayOfWeek: string
  windows: string[]
}): string {
  const day = normalizeDay(input.dayOfWeek) || 'today'
  const wins = input.windows.filter(Boolean)
  const windowLabel = wins.length >= 2 ? wins.join(' and ') : wins[0] || 'non-contiguous times'
  return `${input.teacherName} teaches ${input.subjectName} to ${input.className} twice ${day === 'today' ? 'today' : `on ${day}`} (${windowLabel}) — not a continuous block`
}

export function buildReturnTooSoonMessage(input: {
  teacherName: string
  className: string
  prevSubject: string
  nextSubject: string
  prevEnd: string
  nextStart: string
  gapPeriods: number
  minGapPeriods: number
}): string {
  return `${input.teacherName} returns to ${input.className} for ${input.nextSubject} at ${input.nextStart}, only ${input.gapPeriods} period${input.gapPeriods === 1 ? '' : 's'} after ${input.prevSubject} ended at ${input.prevEnd} — minimum gap is ${input.minGapPeriods} period${input.minGapPeriods === 1 ? '' : 's'}`
}

/**
 * Detect Rule A and Rule B violations. Does not consult CLASS_DOUBLE_BOOKED / overlap.
 */
export function detectTeacherClassSessionIssues(
  fragmentsInput: SessionFragment[],
  rulesInput?: Partial<TeacherClassSessionRulesConfig> | null
): TeacherClassSessionIssue[] {
  const rules = normalizeTeacherClassSessionRules(rulesInput)
  const fragments = fragmentsInput.filter(Boolean)
  const issues: TeacherClassSessionIssue[] = []

  // Rule A — group teacher+class+subject+day
  const byTcsd = new Map<string, SessionFragment[]>()
  for (const f of fragments) {
    const k = `${f.teacherId}|${f.classId}|${f.subjectId}|${f.dayOfWeek}`
    if (!byTcsd.has(k)) byTcsd.set(k, [])
    byTcsd.get(k)!.push(f)
  }

  for (const [, list] of byTcsd) {
    if (list.length < 2) continue
    const blocks = collapseContiguousBlocks(list)
    if (blocks.length < 2) continue

    const sample = list[0]
    const windows = blocks.map((b) => formatTimeWindow(b.startTime, b.endTime))
    issues.push({
      type: TEACHER_CLASS_SUBJECT_SPLIT,
      severity: rules.ruleASeverity,
      message: buildSubjectSplitMessage({
        teacherName: labelTeacher(sample),
        className: labelClass(sample),
        subjectName: labelSubject(sample),
        dayOfWeek: sample.dayOfWeek,
        windows,
      }),
      entityId: sample.teacherId,
      teacherId: sample.teacherId,
      classId: sample.classId,
      dayOfWeek: sample.dayOfWeek,
      subjectIds: [sample.subjectId],
      assignmentIds: blocks.flatMap((b) => b.fragments.map((f) => f.id)),
    })
  }

  // Rule B — group teacher+class+day, compare contiguous blocks across subjects
  const byTcd = new Map<string, SessionFragment[]>()
  for (const f of fragments) {
    const k = `${f.teacherId}|${f.classId}|${f.dayOfWeek}`
    if (!byTcd.has(k)) byTcd.set(k, [])
    byTcd.get(k)!.push(f)
  }

  for (const [, list] of byTcd) {
    // Build blocks per subject first so contiguous same-subject rows merge
    const bySubject = new Map<string, SessionFragment[]>()
    for (const f of list) {
      if (!bySubject.has(f.subjectId)) bySubject.set(f.subjectId, [])
      bySubject.get(f.subjectId)!.push(f)
    }
    const allBlocks: SessionBlock[] = []
    for (const [, subList] of bySubject) {
      allBlocks.push(...collapseContiguousBlocks(subList))
    }
    allBlocks.sort((a, b) => {
      const ta = parseTimeToMinutes(a.startTime) ?? 0
      const tb = parseTimeToMinutes(b.startTime) ?? 0
      return ta - tb || a.startPeriod - b.startPeriod
    })

    for (let i = 0; i < allBlocks.length - 1; i++) {
      const earlier = allBlocks[i]
      const later = allBlocks[i + 1]
      if (earlier.subjectId === later.subjectId) continue // Rule A owns same-subject splits

      const gap = periodGapBetween(earlier, later)
      if (gap >= rules.minGapPeriods) continue

      const sample = earlier.fragments[0]
      issues.push({
        type: TEACHER_CLASS_RETURN_TOO_SOON,
        severity: rules.ruleBSeverity,
        message: buildReturnTooSoonMessage({
          teacherName: labelTeacher(sample),
          className: labelClass(sample),
          prevSubject: labelSubject(earlier),
          nextSubject: labelSubject(later),
          prevEnd: normalizeClock(earlier.endTime),
          nextStart: normalizeClock(later.startTime),
          gapPeriods: Math.max(0, gap),
          minGapPeriods: rules.minGapPeriods,
        }),
        entityId: sample.teacherId,
        teacherId: sample.teacherId,
        classId: sample.classId,
        dayOfWeek: sample.dayOfWeek,
        subjectIds: [earlier.subjectId, later.subjectId],
        assignmentIds: [...earlier.fragments.map((f) => f.id), ...later.fragments.map((f) => f.id)],
      })
    }
  }

  return issues
}

/**
 * Placement check for greedy/backtrack (same rule as detectTeacherClassSessionIssues).
 * Returns a reason code when the candidate would violate Rule A or hard Rule B.
 * Soft Rule B returns a soft reason so callers can honour strictSoftConstraints.
 */
export function teacherClassSessionPlacementViolation(
  candidate: SessionFragment,
  placed: SessionFragment[],
  rulesInput?: Partial<TeacherClassSessionRulesConfig> | null
): { rule: TeacherClassSessionIssueType; severity: RuleSeverity; reason: string } | null {
  const rules = normalizeTeacherClassSessionRules(rulesInput)
  const merged = [...placed.filter((p) => p.id !== candidate.id), candidate]
  const issues = detectTeacherClassSessionIssues(merged, rules)
  const hit = issues.find((i) => i.assignmentIds.includes(candidate.id))
  if (!hit) return null
  return {
    rule: hit.type,
    severity: hit.severity,
    reason:
      hit.type === TEACHER_CLASS_SUBJECT_SPLIT
        ? 'teacher_class_subject_split'
        : 'teacher_class_return_too_soon',
  }
}
