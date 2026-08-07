'use client'

import { useEffect, useRef } from 'react'
import { isWebPushSupported, subscribeToWebPush } from '@/lib/notifications/clientWebPush'

/**
 * Quietly registers the service worker and re-subscribes web push ONLY when
 * Notification.permission is already "granted".
 *
 * Never calls Notification.requestPermission() — that must come from an
 * explicit user gesture (e.g. NotificationPreferences "Enable browser push").
 * Auto-prompting on mount triggers Malwarebytes Browser Guard heuristic 10008.
 */
export function WebPushAutoEnable() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current || typeof window === 'undefined') return
    ran.current = true
    ;(async () => {
      if (!isWebPushSupported()) return

      try {
        if ('serviceWorker' in navigator) {
          const existing = await navigator.serviceWorker.getRegistration()
          if (!existing) await navigator.serviceWorker.register('/sw.js')
        }

        // Only restore subscription if the user already granted permission.
        if (Notification.permission === 'granted') {
          await subscribeToWebPush()
        }
      } catch {
        /* non-critical */
      }
    })()
  }, [])

  return null
}
