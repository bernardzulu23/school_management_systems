'use client'

/**
 * React hook: online/offline state and background sync via the central engine.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { flushOfflineQueues, getAllPendingCount } from '@/lib/offline/sync/engine'
import { OFFLINE_QUEUE_EVENT, OFFLINE_SYNCED_EVENT } from '@/lib/offline/events'
import { attendanceStore } from './attendance-store'
import { resultsStore } from './results-store'

/**
 * @param {{ channel?: 'all' | 'attendance' | 'results', userId?: string, postGradebook?: (payload: object) => Promise<unknown> }} [options]
 */
export function useOfflineSync(options = {}) {
  const channel = options.channel || 'all'
  const userId = options.userId || ''
  const postGradebook = options.postGradebook

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const syncingRef = useRef(false)
  const postGradebookRef = useRef(postGradebook)

  useEffect(() => {
    postGradebookRef.current = postGradebook
  }, [postGradebook])

  const refreshPendingCount = useCallback(async () => {
    if (channel === 'all') {
      const counts = await getAllPendingCount(userId)
      setPendingCount(counts.total)
      return
    }
    let count = 0
    if (channel === 'attendance') {
      count += await attendanceStore.getPendingCount()
    }
    if (channel === 'results') {
      count += await resultsStore.getPendingCount(userId)
    }
    setPendingCount(count)
  }, [channel, userId])

  const syncNow = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.onLine || syncingRef.current) {
      return { synced: 0, failed: 0 }
    }
    syncingRef.current = true
    setSyncing(true)
    try {
      const channels =
        channel === 'attendance'
          ? ['attendance']
          : channel === 'results'
            ? ['results']
            : ['attendance', 'results', 'mutations']
      const result = await flushOfflineQueues({
        userId,
        postGradebook: postGradebookRef.current || undefined,
        channels,
      })
      setLastSync({ ...result, at: new Date() })
      await refreshPendingCount()
      return result
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [channel, userId, refreshPendingCount])

  useEffect(() => {
    refreshPendingCount()

    const handleOnline = () => {
      setIsOnline(true)
      syncNow()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener(OFFLINE_QUEUE_EVENT, refreshPendingCount)
    window.addEventListener(OFFLINE_SYNCED_EVENT, refreshPendingCount)

    const interval = setInterval(() => {
      if (navigator.onLine) syncNow()
    }, 30_000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(OFFLINE_QUEUE_EVENT, refreshPendingCount)
      window.removeEventListener(OFFLINE_SYNCED_EVENT, refreshPendingCount)
      clearInterval(interval)
    }
  }, [syncNow, refreshPendingCount])

  return { isOnline, pendingCount, syncing, lastSync, syncNow, refreshPendingCount }
}
