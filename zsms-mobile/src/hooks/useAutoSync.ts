import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useAuthStore } from '@/store/authStore'
import { useOfflineQueue } from '@/store/offlineQueue'
import { getAccessToken, getSubdomain } from '@/storage/secure'

const SYNC_INTERVAL_MS = 30_000
const POST_LOGIN_DELAY_MS = 2_000

/**
 * Background sync aligned with web (30s + online) and desktop Rust worker.
 * Waits briefly after login so token + school subdomain are readable before flush.
 */
export function useAutoSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const flushOfflineQueue = useOfflineQueue((s) => s.flushOfflineQueue)
  const appState = useRef<AppStateStatus>(AppState.currentState)
  const flushRef = useRef(flushOfflineQueue)
  flushRef.current = flushOfflineQueue

  useEffect(() => {
    if (!isAuthenticated || !isReady) return

    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    const tryFlush = async () => {
      const state = useOfflineQueue.getState()
      if (!state.items.length || state.syncing) return
      const token = await getAccessToken()
      const subdomain = await getSubdomain()
      if (!token || !subdomain) return
      if (cancelled) return
      void flushRef.current()
    }

    const boot = async () => {
      // Avoid racing SecureStore / subdomain right after login.
      await new Promise((r) => setTimeout(r, POST_LOGIN_DELAY_MS))
      if (cancelled) return
      await tryFlush()
      if (cancelled) return
      interval = setInterval(() => {
        void tryFlush()
      }, SYNC_INTERVAL_MS)
    }

    void boot()

    const onAppState = (next: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/)
      appState.current = next
      if (wasBackground && next === 'active') void tryFlush()
    }

    const sub = AppState.addEventListener('change', onAppState)

    return () => {
      cancelled = true
      sub.remove()
      if (interval) clearInterval(interval)
    }
  }, [isAuthenticated, isReady])
}
