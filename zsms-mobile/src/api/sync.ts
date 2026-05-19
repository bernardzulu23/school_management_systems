import { api } from './client'
import type { AttendanceBatch, OfflineQueueItem, SbaScoreSubmit, SyncResult } from '@/types'

export async function flushOfflineQueue(items: OfflineQueueItem[]): Promise<SyncResult> {
  const attendance: AttendanceBatch[] = []
  const scores: SbaScoreSubmit[] = []

  for (const item of items) {
    if (item.type === 'attendance') attendance.push(item.payload)
    else scores.push(item.payload)
  }

  return api<SyncResult>('/api/mobile/sync', {
    method: 'POST',
    body: JSON.stringify({ attendance, scores }),
  })
}
