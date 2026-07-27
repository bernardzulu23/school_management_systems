import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import {
  addNotificationResponseListener,
  registerForPushNotificationsAsync,
} from '@/lib/notifications'
import { registerPushToken } from '@/api/push'

/**
 * Registers the device for push notifications and syncs the Expo token to the
 * backend once the user is authenticated. Also handles notification taps.
 */
export function usePushRegistration(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const done = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      done.current = false
      return
    }
    if (done.current) return
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

  useEffect(() => {
    if (!isAuthenticated) return
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as { actionUrl?: string } | undefined
      const url = String(data?.actionUrl || '').trim()
      if (!url) return
      // Only handle in-app paths; ignore absolute http URLs.
      if (url.startsWith('/')) {
        try {
          router.push(url as never)
        } catch {
          /* ignore */
        }
      }
    })
    return () => sub.remove()
  }, [isAuthenticated])
}
