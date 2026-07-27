'use client'

import { useEffect, useRef } from 'react'
import { isWebPushSupported, subscribeToWebPush } from '@/lib/notifications/clientWebPush'

const PROMPT_KEY = 'zsms-web-push-prompted-v1'

/**
 * Quietly registers the service worker and, when the user previously granted
 * permission (or we haven't asked yet on this browser), enables web push.
 * Mounted once from the dashboard shell so web + desktop webview both opt in.
 */
export function WebPushAutoEnable() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current || typeof window === 'undefined') return
    ran.current = true
    ;(async () => {
      if (!isWebPushSupported()) return

      try {
        // Always ensure SW is registered so push events can arrive later.
        if ('serviceWorker' in navigator) {
          const existing = await navigator.serviceWorker.getRegistration()
          if (!existing) await navigator.serviceWorker.register('/sw.js')
        }

        const permission = Notification.permission
        if (permission === 'denied') return

        if (permission === 'granted') {
          await subscribeToWebPush()
          return
        }

        // Ask once per browser profile (not every page load).
        if (localStorage.getItem(PROMPT_KEY) === '1') return
        localStorage.setItem(PROMPT_KEY, '1')
        await subscribeToWebPush()
      } catch {
        /* non-critical */
      }
    })()
  }, [])

  return null
}
