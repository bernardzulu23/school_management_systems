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
  const lastActivityAt = useAuth((s) => s.lastActivityAt)
  const markActivity = useAuth((s) => s.markActivity)
  const syncSession = useAuth((s) => s.syncSession)
  const logout = useAuth((s) => s.logout)

  useEffect(() => {
    let lastMarkedAt = 0
    const handler = () => {
      const now = Date.now()
      if (now - lastMarkedAt < 1500) return
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
    let interval
    let lastKeepAliveAt = 0
    const idleLimitMs = 10 * 60 * 1000
    const keepAliveEveryMs = 8 * 60 * 1000

    const tick = async () => {
      if (!isAuthenticated) return
      const now = Date.now()
      const idleMs = lastActivityAt && lastActivityAt > 0 ? now - lastActivityAt : idleLimitMs + 1

      if (idleMs > idleLimitMs) {
        await logout?.()
        return
      }

      if (now - lastKeepAliveAt > keepAliveEveryMs) {
        lastKeepAliveAt = now
        await syncSession?.({ force: true })
      }
    }

    interval = setInterval(tick, 60 * 1000)
    tick()

    return () => clearInterval(interval)
  }, [isAuthenticated, lastActivityAt, logout, syncSession])

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
