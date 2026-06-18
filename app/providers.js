'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppThemeProvider } from '@/lib/theme/AppThemeProvider'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { SchoolProvider, useSchool } from '@/lib/context/SchoolContext'
import { SchoolFeaturesProvider } from '@/lib/school/SchoolFeaturesContext'
import { getSchoolFeatures } from '@/lib/school/schoolTypeHelpers'
import { withBrowserSessionFetchInit } from '@/lib/security/browserSessionHeaders'
import { useAuth } from '@/lib/auth'
import GlobalTopLoadingBar from '@/components/ui/GlobalTopLoadingBar'
import GlobalBackButton from '@/components/ui/GlobalBackButton'
import OfflineBanner from '@/components/ui/OfflineBanner'

function PWALoader() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('SW registration failed:', err))
    }
  }, [])
  return null
}

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

function SchoolFeaturesBridge({ children }) {
  const { school } = useSchool()
  const features = useMemo(
    () => getSchoolFeatures(school || { level: 'combined', ownershipType: 'PRIVATE' }),
    [school]
  )
  return <SchoolFeaturesProvider features={features}>{children}</SchoolFeaturesProvider>
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
          const res = await fetch(
            '/api/auth/refresh',
            withBrowserSessionFetchInit({
              method: 'POST',
              credentials: 'include',
              cache: 'no-store',
            })
          )

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
  const isAuthenticated = useAuth((s) => s.isAuthenticated)

  useEffect(() => {
    let interval

    const attemptSync = async () => {
      try {
        await syncSession()
      } catch (err) {
        return
      }
    }

    attemptSync()
    if (isAuthenticated) {
      interval = setInterval(attemptSync, 120000)
    }

    return () => clearInterval(interval)
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const pathname = usePathname()
  const skipSessionSync =
    typeof pathname === 'string' &&
    (pathname === '/' ||
      pathname === '/register-school' ||
      pathname.startsWith('/register-school/') ||
      pathname === '/forgot-password' ||
      pathname.startsWith('/forgot-password/') ||
      pathname === '/reset-password' ||
      pathname.startsWith('/reset-password/') ||
      pathname === '/onboarding' ||
      pathname.startsWith('/onboarding/') ||
      pathname === '/login' ||
      pathname.startsWith('/login/'))

  return (
    <QueryClientProvider client={queryClient}>
      <SchoolProvider>
        <SchoolFeaturesBridge>
          <PWALoader />
          <DevServiceWorkerReset />
          {skipSessionSync ? (
            <AppThemeProvider defaultTheme="light" enableSystem={false}>
              <GlobalTopLoadingBar />
              <GlobalBackButton />
              <OfflineBanner />
              {children}
            </AppThemeProvider>
          ) : (
            <ActivitySessionKeeper>
              <AuthSessionSync>
                <AppThemeProvider defaultTheme="light" enableSystem={false}>
                  <GlobalTopLoadingBar />
                  <GlobalBackButton />
                  {children}
                </AppThemeProvider>
              </AuthSessionSync>
            </ActivitySessionKeeper>
          )}
        </SchoolFeaturesBridge>
      </SchoolProvider>
    </QueryClientProvider>
  )
}
