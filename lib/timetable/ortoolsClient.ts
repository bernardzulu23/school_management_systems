/**
 * Client for optional Python OR-Tools timetable solver service (Phase 3 P3.3).
 * Set ORTOOLS_SOLVER_URL e.g. http://localhost:8090/solve or run subprocess locally.
 */

export type OrtoolsPayload = {
  teachers: Array<{ id: string; maxPeriods?: number }>
  classes: Array<{ id: string }>
  subjects?: Array<{ id: string }>
  lessons: Array<{
    id: string
    teacherId: string
    classId: string
    subjectId: string
    periodsPerWeek: number
  }>
  slots: Array<{
    day: string
    period: number
    startTime: string
    endTime: string
    isBreak?: boolean
  }>
  /** Shared with teacherClassSessionRules.ts + teacherWorkloadRules.ts / solve.py */
  sessionRules?: {
    minGapPeriods: number
    enforceSubjectSplit?: boolean
    enforceReturnGap?: boolean
    maxPeriodsPerDay?: number
    maxConsecutivePeriods?: number
    enforceDayLimit?: boolean
    enforceConsecutiveLimit?: boolean
  }
  timeoutSec?: number
}

export type OrtoolsResult = {
  assignments: Array<Record<string, unknown>>
  status: string
  error?: string
}

/**
 * Call remote solver HTTP service.
 */
export async function callOrtoolsHttp(
  baseUrl: string,
  payload: OrtoolsPayload
): Promise<OrtoolsResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/solve`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout((payload.timeoutSec || 30) * 1000 + 5000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { assignments: [], status: 'error', error: data?.error || res.statusText }
  }
  return data as OrtoolsResult
}
