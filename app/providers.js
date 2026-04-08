'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'
import { SchoolProvider } from '@/lib/context/SchoolContext'
import { useAuth } from '@/lib/auth'
import GlobalTopLoadingBar from '@/components/ui/GlobalTopLoadingBar'
import GlobalBackButton from '@/components/ui/GlobalBackButton'

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
    const idleLimitMs = 10 * 60 * 1000
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
        await state.logout?.()
        return
      }

      if (now - lastKeepAliveAt > keepAliveEveryMs) {
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
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
      // ✅ Already hit limit — do nothing (belt + suspenders)
      if (failCount >= 3) {
        clearInterval(interval)
        return
      }

      try {
        const result = await syncSession()

        if (result?.success) {
          failCount = 0 // reset on success
          return
        }

        if (result?.rateLimited) return

        // ✅ Any non-success non-rateLimited response = failure
        failCount += 1
        console.log(`[Auth] Sync failed (${failCount}/3)`)

        if (failCount >= 3) {
          clearInterval(interval)
          console.log('[Auth] Session sync stopped — not authenticated')
        }
      } catch (err) {
        // ✅ syncSession threw instead of returning — still counts as failure
        failCount += 1
        console.log(`[Auth] Sync error (${failCount}/3):`, err?.message)

        if (failCount >= 3) {
          clearInterval(interval)
          console.log('[Auth] Session sync stopped — error threshold reached')
        }
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
