import { api, ApiError } from './client'
import { wasRecentlyAuthenticated } from '@/lib/authGrace'
import type {
  LessonSessionSyncPayload,
  OfflineQueueItem,
  SbaScoreSubmit,
  SyncResult,
} from '@/types'

export type FlushOutcome = {
  synced: number
  failed: number
  /** Permanent failures that were discarded (not re-queued). */
  discarded: number
  /** Items that still need retry (failed or not attempted). */
  remaining: OfflineQueueItem[]
  lastError?: string
}

function isRetryableError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return true
  // Network / redirect / server errors — keep in queue.
  if (e.status === 0 || e.status >= 500) return true
  if (e.status === 408 || e.status === 429) return true
  // Right after login, 401/403 can be a race (token/subdomain not readable yet).
  if ((e.status === 401 || e.status === 403) && wasRecentlyAuthenticated(20_000)) {
    return true
  }
  if (e.status === 401) return true
  // Permanent client errors (validation, forbidden assignment, not found) — drop.
  return false
}

/**
 * Flush offline queue with partial-success awareness.
 * Daily attendance → POST /api/attendance (same path as web + desktop).
 * Scores + lesson sessions → POST /api/mobile/sync.
 */
export async function flushOfflineQueue(items: OfflineQueueItem[]): Promise<FlushOutcome> {
  if (!items.length) return { synced: 0, failed: 0, discarded: 0, remaining: [] }

  const remaining: OfflineQueueItem[] = []
  let synced = 0
  let failed = 0
  let discarded = 0
  let lastError: string | undefined

  const attendanceItems = items.filter((i) => i.type === 'attendance')
  const scoreItems = items.filter((i) => i.type === 'score')
  const lessonItems = items.filter((i) => i.type === 'lessonSession')

  for (const item of attendanceItems) {
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          date: item.payload.date,
          classId: item.payload.classId,
          subjectId: item.payload.subjectId,
          records: item.payload.records,
          source: item.payload.source || 'mobile-offline-sync',
        }),
      })
      synced += 1
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Attendance sync failed'
      if (isRetryableError(e)) {
        remaining.push(item)
        failed += 1
      } else {
        discarded += 1
        failed += 1
      }
    }
  }

  if (scoreItems.length || lessonItems.length) {
    const scores: SbaScoreSubmit[] = scoreItems.map((i) => i.payload)
    const lessonSessions: LessonSessionSyncPayload[] = lessonItems.map((i) => i.payload)

    try {
      const result = await api<SyncResult>('/api/mobile/sync', {
        method: 'POST',
        body: JSON.stringify({ attendance: [], scores, lessonSessions }),
      })

      const failedScoreIdx = new Set((result.scores?.failed || []).map((f) => f.index))
      const failedLessonIdx = new Set((result.lessonSessions?.failed || []).map((f) => f.index))

      scoreItems.forEach((item, index) => {
        if (failedScoreIdx.has(index)) {
          remaining.push(item)
          failed += 1
        } else {
          synced += 1
        }
      })

      lessonItems.forEach((item, index) => {
        if (failedLessonIdx.has(index)) {
          remaining.push(item)
          failed += 1
        } else {
          synced += 1
        }
      })
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Sync failed'
      if (isRetryableError(e)) {
        remaining.push(...scoreItems, ...lessonItems)
        failed += scoreItems.length + lessonItems.length
      } else {
        discarded += scoreItems.length + lessonItems.length
        failed += scoreItems.length + lessonItems.length
      }
    }
  }

  return { synced, failed, discarded, remaining, lastError }
}
