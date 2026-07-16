'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppThemeProvider } from '@/lib/theme/AppThemeProvider'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { SchoolProvider, useSchool } from '@/lib/context/SchoolContext'
import { SchoolFeaturesProvider } from '@/lib/school/SchoolFeaturesContext'
import { getSchoolFeatures } from '@/lib/school/schoolTypeHelpers'
import { installApiFetchPatch } from '@/lib/auth/installApiFetch'
import { installSafeToastPatch } from '@/lib/ui/installSafeToast'
import { useAuth } from '@/lib/auth'
import IdleSessionGuard from '@/components/auth/IdleSessionGuard'
import GlobalTopLoadingBar from '@/components/ui/GlobalTopLoadingBar'
import GlobalBackButton from '@/components/ui/GlobalBackButton'
import OfflineBanner from '@/components/ui/OfflineBanner'

if (typeof window !== 'undefined') {
  installApiFetchPatch()
  installSafeToastPatch()
}

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
      pathname.startsWith('/login/') ||
      pathname === '/platform/login' ||
      pathname.startsWith('/platform/login/'))

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
            <IdleSessionGuard>
              <AuthSessionSync>
                <AppThemeProvider defaultTheme="light" enableSystem={false}>
                  <GlobalTopLoadingBar />
                  <GlobalBackButton />
                  {children}
                </AppThemeProvider>
              </AuthSessionSync>
            </IdleSessionGuard>
          )}
        </SchoolFeaturesBridge>
      </SchoolProvider>
    </QueryClientProvider>
  )
}
