import { api } from './client'
import type { StudentResult } from '@/types'

export interface ResultsPage {
  results: StudentResult[]
  total: number
  page: number
  totalPages: number
}

export async function loadStudentResults(page = 1, limit = 50): Promise<ResultsPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  const data = await api<{
    data?: StudentResult[]
    pagination?: { total?: number; page?: number; totalPages?: number }
  }>(`/api/student/results?${params}`)
  return {
    results: data.data || [],
    total: data.pagination?.total || 0,
    page: data.pagination?.page || page,
    totalPages: data.pagination?.totalPages || 1,
  }
}
