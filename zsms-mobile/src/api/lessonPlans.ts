import { api } from './client'
import type { LessonPlanDetail, LessonPlanSummary } from '@/types'

export async function loadLessonPlans(): Promise<LessonPlanSummary[]> {
  const data = await api<{ data?: { plans?: LessonPlanSummary[] } }>('/api/lesson-plans?scope=mine')
  return data.data?.plans || []
}

export async function loadLessonPlan(id: string): Promise<LessonPlanDetail> {
  const data = await api<{ data?: LessonPlanDetail; plan?: LessonPlanDetail }>(
    `/api/lesson-plans/${id}`
  )
  const plan = data.data || data.plan
  if (!plan) throw new Error('Lesson plan not found')
  return plan
}
