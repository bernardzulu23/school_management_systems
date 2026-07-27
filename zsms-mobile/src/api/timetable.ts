import { api } from './client'
import type { TimetableView } from '@/types'

export interface TimetableFilters {
  term?: string
  academicYear?: number | string
}

export async function loadActiveSeason(): Promise<{ term: string; academicYear: string }> {
  try {
    const data = await api<{ term?: string; academicYear?: string }>(
      '/api/timetable/active-season?prefer=published'
    )
    return {
      term: data.term || 'Term 1',
      academicYear: data.academicYear || String(new Date().getFullYear()),
    }
  } catch {
    return { term: 'Term 1', academicYear: String(new Date().getFullYear()) }
  }
}

export async function loadTimetable(filters: TimetableFilters = {}): Promise<TimetableView> {
  let term = filters.term
  let academicYear = filters.academicYear

  if (!term || academicYear == null) {
    const season = await loadActiveSeason()
    term = term || season.term
    academicYear = academicYear ?? season.academicYear
  }

  const params = new URLSearchParams()
  if (term) params.set('term', String(term))
  if (academicYear != null) params.set('academicYear', String(academicYear))
  params.set('status', 'published')
  const data = await api<Partial<TimetableView>>(`/api/timetable/view?${params}`)
  return {
    assignments: data.assignments || [],
    timeSlots: data.timeSlots || [],
    term: data.term || String(term) || 'Term 1',
    academicYear: data.academicYear || String(academicYear || new Date().getFullYear()),
    status: data.status || 'published',
    message: data.message,
  }
}

export function weekdayKey(date = new Date()): string {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    date.getDay()
  ]
}
