/**
 * Teacher workload limits (Prompt 7) — shared by validateTimetable (audit),
 * canPlace (generation), and CP-SAT solve.py.
 *
 * Settings live on TimetableConfig.schedulingRules alongside session Rules A/B:
 *   - maxPeriodsPerDay (+ maxPeriodsPerDayEnabled)
 *   - maxConsecutivePeriods (+ maxConsecutivePeriodsEnabled)
 *   - break/lunch coverage (+ requireBreakCoverageEnabled)
 *
 * All three checks are OFF by default (opt-in per school). Rules A/B are separate
 * and remain always on.
 */

import { formatTimeWindow, halfOpenTimeRangesOverlap, parseTimeToMinutes } from './timeRangeOverlap'
import type { RuleSeverity } from './teacherClassSessionRules'

export const TEACHER_DAY_OVERLOAD = 'TEACHER_DAY_OVERLOAD' as const
/** Alias used in some docs / suggested-fix copy. */
export const TEACHER_OVERLOAD = TEACHER_DAY_OVERLOAD
export const TEACHER_CONSECUTIVE_LIMIT = 'TEACHER_CONSECUTIVE_LIMIT' as const
export const TEACHER_BREAK_OVERLAP = 'TEACHER_BREAK_OVERLAP' as const

export type TeacherWorkloadIssueType =
  | typeof TEACHER_DAY_OVERLOAD
  | typeof TEACHER_CONSECUTIVE_LIMIT
  | typeof TEACHER_BREAK_OVERLAP

export type BreakSlotLike = {
  start: string
  end: string
  label?: string | null
  isLunch?: boolean | null
}

export type TeacherWorkloadRulesConfig = {
  /** When false, skip day-load detection entirely. Default false (opt-in). */
  maxPeriodsPerDayEnabled: boolean
  /** Max teaching period weight per teacher per day (doubles count as 2). Default 6. */
  maxPeriodsPerDay: number
  /** When false, skip consecutive-run detection entirely. Default false (opt-in). */
  maxConsecutivePeriodsEnabled: boolean
  /** Max back-to-back teaching periods without a free/break gap. Default 4. */
  maxConsecutivePeriods: number
  dayOverloadSeverity: RuleSeverity
  consecutiveSeverity: RuleSeverity
  /** When false, skip break/lunch overlap detection entirely. Default false (opt-in). */
  requireBreakCoverageEnabled: boolean
  /** Teaching through a designated break/lunch window. Default hard. */
  breakOverlapSeverity: RuleSeverity
}

export const DEFAULT_TEACHER_WORKLOAD_RULES: TeacherWorkloadRulesConfig = {
  maxPeriodsPerDayEnabled: false,
  maxPeriodsPerDay: 6,
  maxConsecutivePeriodsEnabled: false,
  maxConsecutivePeriods: 4,
  dayOverloadSeverity: 'soft',
  consecutiveSeverity: 'soft',
  requireBreakCoverageEnabled: false,
  breakOverlapSeverity: 'hard',
}

export type WorkloadFragment = {
  id: string
  teacherId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  /** Period weight (1 for single, 2 for double, …). */
  periodWeight: number
  teacherName?: string | null
}

export type TeacherWorkloadIssue = {
  type: TeacherWorkloadIssueType
  severity: RuleSeverity
  message: string
  entityId?: string
  assignmentIds: string[]
  teacherId?: string
  dayOfWeek?: string
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

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, Math.floor(v)))
}

export function normalizeTeacherWorkloadRules(
  raw?: Partial<TeacherWorkloadRulesConfig> | null
): TeacherWorkloadRulesConfig {
  return {
    maxPeriodsPerDayEnabled: raw?.maxPeriodsPerDayEnabled === true,
    maxPeriodsPerDay: clampInt(raw?.maxPeriodsPerDay, 1, 16, 6),
    maxConsecutivePeriodsEnabled: raw?.maxConsecutivePeriodsEnabled === true,
    maxConsecutivePeriods: clampInt(raw?.maxConsecutivePeriods, 1, 12, 4),
    dayOverloadSeverity: raw?.dayOverloadSeverity === 'hard' ? 'hard' : 'soft',
    consecutiveSeverity: raw?.consecutiveSeverity === 'hard' ? 'hard' : 'soft',
    requireBreakCoverageEnabled: raw?.requireBreakCoverageEnabled === true,
    breakOverlapSeverity: raw?.breakOverlapSeverity === 'soft' ? 'soft' : 'hard',
  }
}

/** Period weight for day-load accounting (doubles/triples count as span). */
export function assignmentPeriodWeight(a: {
  consecutivePeriods?: number | null
  periodType?: string | null
  isDoublePeriod?: boolean | null
  durationMin?: number | null
}): number {
  const fromConsecutive = Number(a.consecutivePeriods)
  if (Number.isFinite(fromConsecutive) && fromConsecutive >= 1) return Math.floor(fromConsecutive)

  const pt = String(a.periodType || '').toUpperCase()
  if (pt.includes('TRIPLE')) return 3
  if (pt.includes('DOUBLE') || a.isDoublePeriod) return 2

  const dur = Number(a.durationMin)
  if (Number.isFinite(dur) && dur > 0) return Math.max(1, Math.round(dur / 40))
  return 1
}

export function workloadFragmentFromAssignment(a: {
  id: string
  teacherId?: string | null
  dayOfWeek?: string | null
  startTime?: string | null
  endTime?: string | null
  consecutivePeriods?: number | null
  periodType?: string | null
  isDoublePeriod?: boolean | null
  durationMin?: number | null
  teacherName?: string | null
  isBreak?: boolean
}): WorkloadFragment | null {
  if (!a || a.isBreak) return null
  const teacherId = String(a.teacherId || '').trim()
  const dayOfWeek = normalizeDay(a.dayOfWeek)
  const startTime = normalizeClock(a.startTime)
  const endTime = normalizeClock(a.endTime)
  if (!teacherId || !dayOfWeek || !startTime || !endTime) return null
  return {
    id: String(a.id),
    teacherId,
    dayOfWeek,
    startTime,
    endTime,
    periodWeight: assignmentPeriodWeight(a),
    teacherName: a.teacherName,
  }
}

/** Wall-clock contiguous teaching (≤5 min gap) — matches prior consecutive detector. */
export function teachingFragmentsAreContiguous(
  earlier: Pick<WorkloadFragment, 'endTime'>,
  later: Pick<WorkloadFragment, 'startTime'>,
  maxGapMinutes = 5
): boolean {
  const a1 = parseTimeToMinutes(earlier.endTime)
  const b0 = parseTimeToMinutes(later.startTime)
  if (a1 == null || b0 == null) return false
  return b0 <= a1 + maxGapMinutes
}

/**
 * Detect day overload, consecutive runs, and break/lunch overlaps for a school term snapshot.
 */
export function detectTeacherWorkloadIssues(
  fragments: WorkloadFragment[],
  rules?: Partial<TeacherWorkloadRulesConfig> | null,
  breakSlots: BreakSlotLike[] = []
): TeacherWorkloadIssue[] {
  const cfg = normalizeTeacherWorkloadRules(rules)
  if (
    !cfg.maxPeriodsPerDayEnabled &&
    !cfg.maxConsecutivePeriodsEnabled &&
    !cfg.requireBreakCoverageEnabled
  ) {
    return []
  }

  const list = (fragments || []).filter(Boolean)
  const issues: TeacherWorkloadIssue[] = []

  if (cfg.maxPeriodsPerDayEnabled || cfg.maxConsecutivePeriodsEnabled) {
    const byTeacherDay = new Map<string, WorkloadFragment[]>()
    for (const f of list) {
      const key = `${f.teacherId}|${f.dayOfWeek}`
      if (!byTeacherDay.has(key)) byTeacherDay.set(key, [])
      byTeacherDay.get(key)!.push(f)
    }

    for (const [key, dayList] of byTeacherDay) {
      const [teacherId, dayOfWeek] = key.split('|')
      const sorted = [...dayList].sort((a, b) => {
        const ta = parseTimeToMinutes(a.startTime) ?? 0
        const tb = parseTimeToMinutes(b.startTime) ?? 0
        if (ta !== tb) return ta - tb
        return String(a.id).localeCompare(String(b.id))
      })
      const name = sorted[0]?.teacherName || 'Teacher'
      const dayLabel = dayOfWeek || 'the day'

      if (cfg.maxPeriodsPerDayEnabled) {
        const totalWeight = sorted.reduce((sum, f) => sum + f.periodWeight, 0)
        if (totalWeight > cfg.maxPeriodsPerDay) {
          issues.push({
            type: TEACHER_DAY_OVERLOAD,
            severity: cfg.dayOverloadSeverity,
            message: `${name} has ${totalWeight} periods on ${dayLabel} (max ${cfg.maxPeriodsPerDay})`,
            entityId: teacherId,
            assignmentIds: sorted.map((f) => f.id),
            teacherId,
            dayOfWeek,
          })
        }
      }

      if (cfg.maxConsecutivePeriodsEnabled) {
        let runWeight = sorted[0]?.periodWeight || 0
        let runStartIdx = 0
        for (let i = 1; i < sorted.length; i++) {
          if (teachingFragmentsAreContiguous(sorted[i - 1], sorted[i])) {
            runWeight += sorted[i].periodWeight
          } else {
            runWeight = sorted[i].periodWeight
            runStartIdx = i
          }
          if (runWeight > cfg.maxConsecutivePeriods) {
            issues.push({
              type: TEACHER_CONSECUTIVE_LIMIT,
              severity: cfg.consecutiveSeverity,
              message: `${name} has more than ${cfg.maxConsecutivePeriods} consecutive periods without a break on ${dayLabel}`,
              entityId: teacherId,
              assignmentIds: sorted.slice(runStartIdx, i + 1).map((f) => f.id),
              teacherId,
              dayOfWeek,
            })
            break
          }
        }
      }
    }
  }

  if (cfg.requireBreakCoverageEnabled) {
    const breaks = (breakSlots || []).filter((b) => b?.start && b?.end)
    if (breaks.length) {
      for (const f of list) {
        for (const br of breaks) {
          if (
            !halfOpenTimeRangesOverlap(
              f.dayOfWeek,
              f.startTime,
              f.endTime,
              f.dayOfWeek,
              br.start,
              br.end
            )
          ) {
            continue
          }
          const label = br.isLunch ? br.label || 'Lunch' : br.label || 'Break'
          const name = f.teacherName || 'Teacher'
          issues.push({
            type: TEACHER_BREAK_OVERLAP,
            severity: cfg.breakOverlapSeverity,
            message: `${name} is scheduled through ${label} (${formatTimeWindow(br.start, br.end)}) on ${f.dayOfWeek}`,
            entityId: f.teacherId,
            assignmentIds: [f.id],
            teacherId: f.teacherId,
            dayOfWeek: f.dayOfWeek,
          })
          break
        }
      }
    }
  }

  return issues
}

/**
 * Placement gate for canPlace — only blocks when the matching severity is hard.
 */
export function teacherWorkloadPlacementViolation(
  candidate: WorkloadFragment,
  placed: WorkloadFragment[],
  rules?: Partial<TeacherWorkloadRulesConfig> | null,
  breakSlots: BreakSlotLike[] = []
): { type: TeacherWorkloadIssueType; severity: RuleSeverity; reason: string } | null {
  const cfg = normalizeTeacherWorkloadRules(rules)
  const dayPlaced = placed.filter(
    (p) => p.teacherId === candidate.teacherId && p.dayOfWeek === candidate.dayOfWeek
  )
  const merged = [...dayPlaced, candidate]
  const issues = detectTeacherWorkloadIssues(merged, cfg, breakSlots).filter(
    (i) =>
      i.teacherId === candidate.teacherId &&
      i.dayOfWeek === candidate.dayOfWeek &&
      i.assignmentIds.includes(candidate.id)
  )

  for (const issue of issues) {
    if (issue.severity !== 'hard') continue
    const reason =
      issue.type === TEACHER_DAY_OVERLOAD
        ? 'teacher_day_limit'
        : issue.type === TEACHER_CONSECUTIVE_LIMIT
          ? 'teacher_consecutive_limit'
          : 'teacher_break_overlap'
    return { type: issue.type, severity: issue.severity, reason }
  }
  return null
}

/** Fields merged into CP-SAT sessionRules payload. */
export function workloadRulesForSolverPayload(rules?: Partial<TeacherWorkloadRulesConfig> | null) {
  const n = normalizeTeacherWorkloadRules(rules)
  return {
    maxPeriodsPerDay: n.maxPeriodsPerDay,
    maxConsecutivePeriods: n.maxConsecutivePeriods,
    enforceDayLimit: n.maxPeriodsPerDayEnabled,
    enforceConsecutiveLimit: n.maxConsecutivePeriodsEnabled,
  }
}
