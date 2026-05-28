'use client'

/**
 * React hook: online/offline state and background attendance sync.
 *
 * @example
 * const { isOnline, pendingCount, syncing, syncNow } = useOfflineSync()
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { attendanceStore } from './attendance-store'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const syncingRef = useRef(false)

  const refreshPendingCount = useCallback(async () => {
    const count = await attendanceStore.getPendingCount()
    setPendingCount(count)
  }, [])

  const syncNow = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.onLine || syncingRef.current) {
      return { synced: 0, failed: 0 }
    }
    syncingRef.current = true
    setSyncing(true)
    try {
      const result = await attendanceStore.syncPending()
      setLastSync({ ...result, at: new Date() })
      await refreshPendingCount()
      return result
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [refreshPendingCount])

  useEffect(() => {
    refreshPendingCount()

    const handleOnline = () => {
      setIsOnline(true)
      syncNow()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(() => {
      if (navigator.onLine) syncNow()
    }, 30_000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [syncNow, refreshPendingCount])

  return { isOnline, pendingCount, syncing, lastSync, syncNow, refreshPendingCount }
}
