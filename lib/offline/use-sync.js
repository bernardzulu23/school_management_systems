'use client'

/**
 * React hook: online/offline state and background sync for attendance + results queues.
 *
 * @example
 * const { isOnline, pendingCount, syncing, syncNow } = useOfflineSync()
 * const { pendingCount } = useOfflineSync({ channel: 'results' })
 */
import { useState, useEffect, useCallback, useRef } from 'react'
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
    let count = 0
    if (channel === 'all' || channel === 'attendance') {
      count += await attendanceStore.getPendingCount()
    }
    if (channel === 'all' || channel === 'results') {
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
      let synced = 0
      let failed = 0
      if (channel === 'all' || channel === 'attendance') {
        const att = await attendanceStore.syncPending()
        synced += att.synced
        failed += att.failed
      }
      if (channel === 'all' || channel === 'results') {
        const res = await resultsStore.syncPending({
          userId,
          postGradebook: postGradebookRef.current || undefined,
        })
        synced += res.synced
        failed += res.failed
      }
      const result = { synced, failed }
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
    window.addEventListener('zsms-offline-queue', refreshPendingCount)

    const interval = setInterval(() => {
      if (navigator.onLine) syncNow()
    }, 30_000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('zsms-offline-queue', refreshPendingCount)
      clearInterval(interval)
    }
  }, [syncNow, refreshPendingCount])

  return { isOnline, pendingCount, syncing, lastSync, syncNow, refreshPendingCount }
}
