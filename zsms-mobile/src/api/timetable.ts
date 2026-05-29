import { api } from './client'
import type { TimetableView } from '@/types'

export interface TimetableFilters {
  term?: string
  academicYear?: number | string
}

export async function loadTimetable(filters: TimetableFilters = {}): Promise<TimetableView> {
  const params = new URLSearchParams()
  if (filters.term) params.set('term', filters.term)
  if (filters.academicYear != null) params.set('academicYear', String(filters.academicYear))
  params.set('status', 'published')
  const data = await api<Partial<TimetableView>>(`/api/timetable/view?${params}`)
  return {
    assignments: data.assignments || [],
    timeSlots: data.timeSlots || [],
    term: data.term || filters.term || 'Term 1',
    academicYear: data.academicYear || String(filters.academicYear || new Date().getFullYear()),
    status: data.status || 'published',
    message: data.message,
  }
}
