import { api } from './client'
import type {
  AttendanceBatch,
  LessonSessionSyncPayload,
  OfflineQueueItem,
  SbaScoreSubmit,
  SyncResult,
} from '@/types'

export async function flushOfflineQueue(items: OfflineQueueItem[]): Promise<SyncResult> {
  const attendance: AttendanceBatch[] = []
  const scores: SbaScoreSubmit[] = []
  const lessonSessions: LessonSessionSyncPayload[] = []

  for (const item of items) {
    if (item.type === 'attendance') attendance.push(item.payload)
    else if (item.type === 'lessonSession') lessonSessions.push(item.payload)
    else scores.push(item.payload)
  }

  return api<SyncResult>('/api/mobile/sync', {
    method: 'POST',
    body: JSON.stringify({ attendance, scores, lessonSessions }),
  })
}
