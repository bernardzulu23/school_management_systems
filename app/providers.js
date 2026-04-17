'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'
import { SchoolProvider } from '@/lib/context/SchoolContext'
import { useAuth } from '@/lib/auth'
import GlobalTopLoadingBar from '@/components/ui/GlobalTopLoadingBar'
import GlobalBackButton from '@/components/ui/GlobalBackButton'

function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const run = async () => {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => [])
      if (!regs || regs.length === 0) return

      const alreadyReloaded = sessionStorage.getItem('dev-sw-reset') === '1'
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)))

      if (!alreadyReloaded) {
        sessionStorage.setItem('dev-sw-reset', '1')
        window.location.reload()
      }
    }

    run()
  }, [])

  return null
}

function ActivitySessionKeeper({ children }) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const markActivity = useAuth((s) => s.markActivity)

  useEffect(() => {
    let lastMarkedAt = 0
    const handler = () => {
      const now = Date.now()
      if (now - lastMarkedAt < 3000) return
      lastMarkedAt = now
      markActivity?.()
    }

    handler()

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }))

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
    }
  }, [markActivity])

  useEffect(() => {
    if (!isAuthenticated) return

    let interval
    let lastKeepAliveAt = 0
    const idleLimitMs = 60 * 60 * 1000
    const keepAliveEveryMs = 5 * 60 * 1000

    const tick = async () => {
      const now = Date.now()
      const state = useAuth.getState()
      if (!state?.isAuthenticated) return

      const idleMs =
        state.lastActivityAt && state.lastActivityAt > 0
          ? now - state.lastActivityAt
          : idleLimitMs + 1

      if (idleMs > idleLimitMs) {
        return
      }

      if (now - lastKeepAliveAt > keepAliveEveryMs) {
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
          })

          if (res.ok) {
            lastKeepAliveAt = now
            await state.syncSession?.({ force: true })
          }
        } catch {}
      }
    }

    interval = setInterval(tick, 60 * 1000)
    tick()

    return () => clearInterval(interval)
  }, [isAuthenticated])

  return children
}

function AuthSessionSync({ children }) {
  const syncSession = useAuth((s) => s.syncSession)

  useEffect(() => {
    let failCount = 0
    let interval

    const attemptSync = async () => {
      try {
        const result = await syncSession()

        if (result?.success) {
          failCount = 0 // reset on success
          return
        }

        if (result?.rateLimited) return

        // Any non-success non-rateLimited response = failure
        failCount += 1
      } catch (err) {
        // syncSession threw instead of returning — still counts as failure
        failCount += 1
      }
    }

    // Run once immediately, then every 2 minutes
    attemptSync()
    interval = setInterval(attemptSync, 120000)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return children
}

export function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SchoolProvider>
        <DevServiceWorkerReset />
        <ActivitySessionKeeper>
          <AuthSessionSync>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <GlobalTopLoadingBar />
              <GlobalBackButton />
              {children}
            </ThemeProvider>
          </AuthSessionSync>
        </ActivitySessionKeeper>
      </SchoolProvider>
    </QueryClientProvider>
  )
}
