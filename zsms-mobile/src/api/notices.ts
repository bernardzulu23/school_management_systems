import { api } from './client'
import type { Notice } from '@/types'

export async function loadNotices(limit = 30): Promise<Notice[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const data = await api<{ data?: Notice[] }>(`/api/student/notices?${params}`)
  return data.data || []
}
