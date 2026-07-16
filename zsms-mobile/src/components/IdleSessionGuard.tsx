import { useEffect, useRef } from 'react'
import { Alert, AppState, type AppStateStatus, StyleSheet, View } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import {
  IDLE_ACTIVITY_THROTTLE_MS,
  IDLE_CHECK_INTERVAL_MS,
  IDLE_LOGOUT_MESSAGE,
  IDLE_TIMEOUT_MS,
  isIdleTimedOut,
} from '@/lib/security/sessionIdle'

function isPublicAuthPath(pathname: string | null | undefined) {
  if (!pathname) return true
  return (
    pathname.includes('(auth)') ||
    pathname.includes('/login') ||
    pathname.includes('/school-select') ||
    pathname.includes('/forgot-password')
  )
}

/**
 * Logs out after IDLE_TIMEOUT_MS of no user activity (mobile parity with web).
 */
export function IdleSessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const markActivity = useAuthStore((s) => s.markActivity)
  const logout = useAuthStore((s) => s.logout)
  const loggingOutRef = useRef(false)
  const lastMarkedAt = useRef(0)
  const publicPath = isPublicAuthPath(pathname)
  const enforceIdle = !publicPath && isAuthenticated

  const onActivity = () => {
    const now = Date.now()
    if (now - lastMarkedAt.current < IDLE_ACTIVITY_THROTTLE_MS) return
    lastMarkedAt.current = now
    markActivity?.()
  }

  useEffect(() => {
    if (!enforceIdle) return undefined

    const state = useAuthStore.getState()
    if (!state.lastActivityAt || state.lastActivityAt <= 0) {
      markActivity?.()
    }

    const forceIdleLogout = async () => {
      if (loggingOutRef.current) return
      loggingOutRef.current = true
      try {
        Alert.alert('Session ended', IDLE_LOGOUT_MESSAGE)
        await logout?.()
        router.replace('/(auth)/login')
      } finally {
        loggingOutRef.current = false
      }
    }

    const checkIdle = () => {
      const current = useAuthStore.getState()
      if (!current?.isAuthenticated) return
      if (isIdleTimedOut(current.lastActivityAt, Date.now(), IDLE_TIMEOUT_MS)) {
        void forceIdleLogout()
      }
    }

    const idleInterval = setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS)
    checkIdle()

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') checkIdle()
    }
    const sub = AppState.addEventListener('change', onAppState)

    return () => {
      clearInterval(idleInterval)
      sub.remove()
    }
  }, [enforceIdle, logout, markActivity, router])

  if (publicPath) return <>{children}</>

  return (
    <View style={styles.fill} onTouchStart={onActivity} onMoveShouldSetResponder={() => false}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
