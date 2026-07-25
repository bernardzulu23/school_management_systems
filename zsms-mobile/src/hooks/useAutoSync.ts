import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useAuthStore } from '@/store/authStore'
import { useOfflineQueue } from '@/store/offlineQueue'

const SYNC_INTERVAL_MS = 30_000

/**
 * Background sync aligned with web (30s + online) and desktop Rust worker.
 * Flushes the offline queue when the app is foregrounded and on a 30s timer.
 */
export function useAutoSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const flushOfflineQueue = useOfflineQueue((s) => s.flushOfflineQueue)
  const appState = useRef<AppStateStatus>(AppState.currentState)
  const flushRef = useRef(flushOfflineQueue)
  flushRef.current = flushOfflineQueue

  useEffect(() => {
    if (!isAuthenticated) return

    const tryFlush = () => {
      const state = useOfflineQueue.getState()
      if (!state.items.length || state.syncing) return
      void flushRef.current()
    }

    tryFlush()

    const onAppState = (next: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/)
      appState.current = next
      if (wasBackground && next === 'active') tryFlush()
    }

    const sub = AppState.addEventListener('change', onAppState)
    const interval = setInterval(tryFlush, SYNC_INTERVAL_MS)

    return () => {
      sub.remove()
      clearInterval(interval)
    }
  }, [isAuthenticated])
}
