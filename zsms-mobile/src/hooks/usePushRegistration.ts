import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { registerForPushNotificationsAsync } from '@/lib/notifications'
import { registerPushToken } from '@/api/push'

/**
 * Registers the device for push notifications and syncs the Expo token to the
 * backend once the user is authenticated. Safe no-op on simulators or when
 * permissions are denied.
 */
export function usePushRegistration(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const done = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || done.current) return
    done.current = true
    ;(async () => {
      try {
        const token = await registerForPushNotificationsAsync()
        if (token) await registerPushToken(token)
      } catch {
        // best-effort; push is non-critical
      }
    })()
  }, [isAuthenticated])
}
