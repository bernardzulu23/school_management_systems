import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { flushOfflineQueue } from '@/api/sync'
import type { AttendanceBatch, OfflineQueueItem, SbaScoreSubmit } from '@/types'

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
  hydrate: () => Promise<void>
  enqueueAttendance: (payload: AttendanceBatch) => Promise<void>
  enqueueScore: (payload: SbaScoreSubmit) => Promise<void>
  getPendingCount: () => number
  flushOfflineQueue: () => Promise<{ synced: number; failed: number }>
  retryFailedItems: () => Promise<void>
  clearOfflineQueue: () => Promise<void>
}

export const useOfflineQueue = create<QueueState>((set, get) => ({
  items: [],
  syncing: false,

  hydrate: async () => {
    const items = await readQueue()
    set({ items })
  },

  enqueueAttendance: async (payload) => {
    const item: OfflineQueueItem = {
      type: 'attendance',
      id: newId(),
      createdAt: new Date().toISOString(),
      payload,
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

  getPendingCount: () => get().items.length,

  flushOfflineQueue: async () => {
    const pending = get().items
    if (!pending.length) return { synced: 0, failed: 0 }
    set({ syncing: true })
    try {
      const result = await flushOfflineQueue(pending)
      const failedCount =
        (result.attendance?.failed?.length || 0) + (result.scores?.failed?.length || 0)
      const synced = (result.attendance?.synced || 0) + (result.scores?.synced || 0)
      if (failedCount === 0) {
        await writeQueue([])
        set({ items: [] })
      }
      return { synced, failed: failedCount }
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
