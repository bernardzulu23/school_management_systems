'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'
import { SchoolProvider } from '@/lib/context/SchoolContext'
import { useAuth } from '@/lib/auth'

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

    // Run once immediately, then every 30s (not 5s)
    attemptSync()
    interval = setInterval(attemptSync, 30000)

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
        <AuthSessionSync>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </AuthSessionSync>
      </SchoolProvider>
    </QueryClientProvider>
  )
}
