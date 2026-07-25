import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { flushOfflineQueue } from '@/api/sync'
import type {
  AttendanceBatch,
  LessonSessionSyncPayload,
  OfflineQueueItem,
  SbaScoreSubmit,
} from '@/types'

const STORAGE_KEY = 'zsms_offline_queue_v1'

async function readQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as OfflineQueueItem[]
  } catch {
    return []
  }
}

async function writeQueue(items: OfflineQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface QueueState {
  items: OfflineQueueItem[]
  syncing: boolean
  lastSyncAt: string | null
  lastSyncError: string | null
  hydrate: () => Promise<void>
  enqueueAttendance: (payload: AttendanceBatch) => Promise<void>
  enqueueScore: (payload: SbaScoreSubmit) => Promise<void>
  enqueueLessonSession: (payload: LessonSessionSyncPayload) => Promise<void>
  mergeLessonSession: (sessionId: string, patch: Partial<LessonSessionSyncPayload>) => Promise<void>
  getPendingCount: () => number
  flushOfflineQueue: () => Promise<{ synced: number; failed: number }>
  retryFailedItems: () => Promise<void>
  clearOfflineQueue: () => Promise<void>
}

export const useOfflineQueue = create<QueueState>((set, get) => ({
  items: [],
  syncing: false,
  lastSyncAt: null,
  lastSyncError: null,

  hydrate: async () => {
    const items = await readQueue()
    set({ items })
  },

  enqueueAttendance: async (payload) => {
    const item: OfflineQueueItem = {
      type: 'attendance',
      id: newId(),
      createdAt: new Date().toISOString(),
      payload: {
        ...payload,
        source: payload.source || 'mobile-offline-sync',
      },
    }
    const items = [...get().items, item]
    await writeQueue(items)
    set({ items })
  },

  enqueueScore: async (payload) => {
    const item: OfflineQueueItem = {
      type: 'score',
      id: newId(),
      createdAt: new Date().toISOString(),
      payload,
    }
    const items = [...get().items, item]
    await writeQueue(items)
    set({ items })
  },

  enqueueLessonSession: async (payload) => {
    const item: OfflineQueueItem = {
      type: 'lessonSession',
      id: newId(),
      createdAt: new Date().toISOString(),
      payload,
    }
    const items = [...get().items, item]
    await writeQueue(items)
    set({ items })
  },

  mergeLessonSession: async (sessionId, patch) => {
    const items = get().items
    const idx = items.findIndex(
      (i) => i.type === 'lessonSession' && i.payload.sessionId === sessionId
    )
    if (idx >= 0) {
      const existing = items[idx]
      if (existing.type !== 'lessonSession') return
      const merged: LessonSessionSyncPayload = {
        ...existing.payload,
        ...patch,
        marks: patch.marks ?? existing.payload.marks,
      }
      const next = [...items]
      next[idx] = { ...existing, payload: merged }
      await writeQueue(next)
      set({ items: next })
      return
    }
    await get().enqueueLessonSession({
      sessionId,
      classId: patch.classId || '',
      subjectId: patch.subjectId || '',
      marks: patch.marks || [],
      close: patch.close,
      sendAbsentSms: patch.sendAbsentSms,
    })
  },

  getPendingCount: () => get().items.length,

  flushOfflineQueue: async () => {
    const pending = get().items
    if (!pending.length) return { synced: 0, failed: 0 }
    if (get().syncing) return { synced: 0, failed: 0 }
    set({ syncing: true, lastSyncError: null })
    try {
      const result = await flushOfflineQueue(pending)
      await writeQueue(result.remaining)
      set({
        items: result.remaining,
        lastSyncAt: new Date().toISOString(),
        lastSyncError: result.failed > 0 ? `${result.failed} item(s) failed to sync` : null,
      })
      return { synced: result.synced, failed: result.failed }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed'
      set({ lastSyncError: message })
      return { synced: 0, failed: pending.length }
    } finally {
      set({ syncing: false })
    }
  },

  retryFailedItems: async () => {
    let attempt = 0
    while (attempt < 3 && get().items.length > 0) {
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000))
      const { failed } = await get().flushOfflineQueue()
      if (failed === 0) break
      attempt += 1
    }
  },

  clearOfflineQueue: async () => {
    await writeQueue([])
    set({ items: [] })
  },
}))
