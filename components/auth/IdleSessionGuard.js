'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import {
  IDLE_ACTIVITY_THROTTLE_MS,
  IDLE_CHECK_INTERVAL_MS,
  IDLE_LOGOUT_MESSAGE,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MESSAGE,
  isIdleTimedOut,
  shouldShowIdleWarning,
} from '@/lib/security/sessionIdle'

const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'pointerdown']

function isPublicAuthPath(pathname) {
  if (typeof pathname !== 'string') return true
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/platform/login' ||
    pathname.startsWith('/platform/login/') ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/forgot-password/') ||
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password/') ||
    pathname === '/register-school' ||
    pathname.startsWith('/register-school/') ||
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/')
  )
}

/**
 * Client UX for idle timeout. Server proxy is the security boundary.
 * Covers school dashboards and platform (super admin) via providers.js.
 */
export default function IdleSessionGuard({ children }) {
  const pathname = usePathname()
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const markActivity = useAuth((s) => s.markActivity)
  const logout = useAuth((s) => s.logout)
  const loggingOutRef = useRef(false)
  const warningShownRef = useRef(false)
  const publicPath = isPublicAuthPath(pathname)
  const enforceIdle = !publicPath && isAuthenticated

  useEffect(() => {
    if (publicPath) return undefined

    let lastMarkedAt = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - lastMarkedAt < IDLE_ACTIVITY_THROTTLE_MS) return
      lastMarkedAt = now
      markActivity?.()
      warningShownRef.current = false
      toast.dismiss('idle-session-warning')
    }

    onActivity()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [markActivity, publicPath])

  useEffect(() => {
    if (!enforceIdle) return undefined

    const state = useAuth.getState()
    if (!state.lastActivityAt || state.lastActivityAt <= 0) {
      markActivity?.()
    }

    const staySignedIn = async () => {
      try {
        const res = await sessionFetch('/api/auth/touch', { method: 'POST' })
        if (res.ok) {
          markActivity?.()
          warningShownRef.current = false
          toast.dismiss('idle-session-warning')
          toast.success('Session extended', { id: 'idle-session-extended', duration: 2500 })
        }
      } catch {
        /* server idle may already have expired */
      }
    }

    const forceIdleLogout = async () => {
      if (loggingOutRef.current) return
      loggingOutRef.current = true
      try {
        toast.error(IDLE_LOGOUT_MESSAGE, { duration: 6000, id: 'idle-session-logout' })
        toast.dismiss('idle-session-warning')
        await logout?.({ redirectTo: '/login?reason=idle' })
      } finally {
        loggingOutRef.current = false
      }
    }

    const checkIdle = () => {
      const current = useAuth.getState()
      if (!current?.isAuthenticated) return
      const now = Date.now()
      if (isIdleTimedOut(current.lastActivityAt, now, IDLE_TIMEOUT_MS)) {
        void forceIdleLogout()
        return
      }
      if (shouldShowIdleWarning(current.lastActivityAt, now) && !warningShownRef.current) {
        warningShownRef.current = true
        toast(
          (t) => (
            <div className="flex flex-col gap-2 text-sm">
              <span>{IDLE_WARNING_MESSAGE}</span>
              <button
                type="button"
                className="rounded bg-ink px-3 py-1.5 text-paper font-medium"
                onClick={() => {
                  toast.dismiss(t.id)
                  void staySignedIn()
                }}
              >
                Stay signed in
              </button>
            </div>
          ),
          { id: 'idle-session-warning', duration: 55_000 }
        )
      }
    }

    const idleInterval = window.setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS)
    checkIdle()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkIdle()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', checkIdle)

    return () => {
      window.clearInterval(idleInterval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', checkIdle)
    }
  }, [enforceIdle, logout, markActivity])

  return children
}
