import { api } from './client'
import type { RosterStudent, SbaScoreSubmit, SbaTask } from '@/types'
import { loadRoster } from './attendance'

export interface SbaTasksFilters {
  formLevel?: number
  subjectId?: string
  component?: string
}

export async function loadSbaTasks(filters: SbaTasksFilters = {}): Promise<SbaTask[]> {
  const params = new URLSearchParams()
  if (filters.formLevel != null) params.set('formLevel', String(filters.formLevel))
  if (filters.subjectId) params.set('subjectId', filters.subjectId)
  if (filters.component) params.set('component', filters.component)
  const data = await api<{ tasks?: SbaTask[]; assessments?: SbaTask[] }>(
    `/api/assessments/sba-tasks?${params}`
  )
  return data.tasks || data.assessments || (Array.isArray(data) ? (data as SbaTask[]) : [])
}

export async function loadScoresForAssessment(filters: {
  subjectId?: string
  formLevel?: number
  academicYear?: number
  assessmentId?: string
}): Promise<unknown[]> {
  const params = new URLSearchParams()
  if (filters.subjectId) params.set('subjectId', filters.subjectId)
  if (filters.formLevel != null) params.set('formLevel', String(filters.formLevel))
  if (filters.academicYear != null) params.set('academicYear', String(filters.academicYear))
  const data = await api<{ scores?: unknown[] }>(`/api/assessments/sba-scores?${params}`)
  return data.scores || []
}

export async function loadRosterForScores(
  classId: string,
  subjectId?: string
): Promise<RosterStudent[]> {
  return loadRoster(classId, subjectId)
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
