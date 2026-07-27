import { api, ApiError } from './client'
import type { RosterStudent, SbaScoreSubmit, SbaTask } from '@/types'
import { loadRoster } from './attendance'

export interface SbaTasksFilters {
  formLevel?: number
  subjectId?: string
  component?: string
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** Server returns `{ success, data }`; older clients expected `tasks` / `assessments`. */
export async function loadSbaTasks(filters: SbaTasksFilters = {}): Promise<SbaTask[]> {
  const params = new URLSearchParams()
  if (filters.formLevel != null) params.set('formLevel', String(filters.formLevel))
  if (filters.subjectId) params.set('subjectId', filters.subjectId)
  if (filters.component) params.set('component', filters.component)
  const data = await api<{
    tasks?: SbaTask[]
    assessments?: SbaTask[]
    data?: SbaTask[]
  }>(`/api/assessments/sba-tasks?${params}`)

  const fromData = asArray<SbaTask>(data.data)
  if (fromData.length) return fromData
  const fromTasks = asArray<SbaTask>(data.tasks)
  if (fromTasks.length) return fromTasks
  const fromAssessments = asArray<SbaTask>(data.assessments)
  if (fromAssessments.length) return fromAssessments
  return Array.isArray(data) ? (data as SbaTask[]) : []
}

export type ScoreRow = {
  studentId?: string
  assessmentId?: string
  learnerName?: string
  totalSBAScore?: number
}

/** Server returns `{ success, data, raw }`; clients previously read `scores`. */
export async function loadScoresForAssessment(filters: {
  subjectId?: string
  formLevel?: number
  academicYear?: number
  assessmentId?: string
}): Promise<ScoreRow[]> {
  const params = new URLSearchParams()
  if (filters.subjectId) params.set('subjectId', filters.subjectId)
  if (filters.formLevel != null) params.set('formLevel', String(filters.formLevel))
  if (filters.academicYear != null) params.set('academicYear', String(filters.academicYear))
  const data = await api<{ scores?: ScoreRow[]; raw?: ScoreRow[]; data?: ScoreRow[] }>(
    `/api/assessments/sba-scores?${params}`
  )

  const raw = asArray<ScoreRow>(data.raw)
  const scores = asArray<ScoreRow>(data.scores)
  const rows = raw.length ? raw : scores.length ? scores : asArray<ScoreRow>(data.data)

  if (filters.assessmentId) {
    return rows.filter((r) => !r.assessmentId || r.assessmentId === filters.assessmentId)
  }
  return rows
}

function normalizeRoster(payload: unknown): RosterStudent[] {
  let rows: any[] = []
  if (Array.isArray(payload)) {
    rows = payload
  } else if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown; students?: unknown }
    if (Array.isArray(obj.data)) rows = obj.data
    else if (Array.isArray(obj.students)) rows = obj.students
  }
  return rows
    .map((s) => ({
      id: String(s.id || s.studentId || ''),
      name: String(s.name || s.learnerName || s.fullName || 'Student'),
      class: s.class != null ? String(s.class) : null,
      qrCode: s.qrCode ?? null,
      faceEmbedding: s.faceEmbedding ?? null,
      twinGroupId: s.twinGroupId ?? null,
      requiresSecondaryAuth: Boolean(s.requiresSecondaryAuth),
      secondaryAuthMethod: s.secondaryAuthMethod ?? null,
    }))
    .filter((s) => s.id)
}

export async function loadRosterForScores(
  classId: string,
  subjectId?: string
): Promise<RosterStudent[]> {
  if (!classId) return []
  try {
    const roster = await loadRoster(classId, subjectId)
    return normalizeRoster(roster)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return []
    throw e
  }
}

export async function submitScore(payload: SbaScoreSubmit): Promise<unknown> {
  return api('/api/assessments/sba-scores', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCompletionPercent(totalStudents: number, scoredCount: number): number {
  if (totalStudents <= 0) return 0
  return Math.round((scoredCount / totalStudents) * 100)
}

export function countScoredStudents(
  scores: Array<{ studentId?: string; assessmentId?: string }>,
  assessmentId: string
): number {
  const ids = new Set(
    scores.filter((s) => s.assessmentId === assessmentId && s.studentId).map((s) => s.studentId)
  )
  return ids.size
}
