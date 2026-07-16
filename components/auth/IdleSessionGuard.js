'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { withBrowserSessionFetchInit } from '@/lib/security/browserSessionHeaders'
import {
  IDLE_ACTIVITY_THROTTLE_MS,
  IDLE_CHECK_INTERVAL_MS,
  IDLE_LOGOUT_MESSAGE,
  IDLE_TIMEOUT_MS,
  isIdleTimedOut,
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
 * Logs out after IDLE_TIMEOUT_MS of no user activity.
 * Covers school dashboards and platform (super admin) routes.
 */
export default function IdleSessionGuard({ children }) {
  const pathname = usePathname()
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const markActivity = useAuth((s) => s.markActivity)
  const logout = useAuth((s) => s.logout)
  const loggingOutRef = useRef(false)
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
    }

    onActivity()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [markActivity, publicPath])

  useEffect(() => {
    if (!enforceIdle) return undefined

    // Ensure a baseline timestamp so we don't treat "never stamped" as idle.
    const state = useAuth.getState()
    if (!state.lastActivityAt || state.lastActivityAt <= 0) {
      markActivity?.()
    }

    const forceIdleLogout = async () => {
      if (loggingOutRef.current) return
      loggingOutRef.current = true
      try {
        toast.error(IDLE_LOGOUT_MESSAGE, { duration: 6000, id: 'idle-session-logout' })
        await logout?.()
      } finally {
        loggingOutRef.current = false
      }
    }

    const checkIdle = () => {
      const current = useAuth.getState()
      if (!current?.isAuthenticated) return
      if (isIdleTimedOut(current.lastActivityAt, Date.now(), IDLE_TIMEOUT_MS)) {
        void forceIdleLogout()
      }
    }

    const keepAliveTick = async () => {
      const current = useAuth.getState()
      if (!current?.isAuthenticated) return
      if (isIdleTimedOut(current.lastActivityAt, Date.now(), IDLE_TIMEOUT_MS)) {
        void forceIdleLogout()
        return
      }
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
          await current.syncSession?.({ force: true })
        }
      } catch {
        /* ignore transient keep-alive errors */
      }
    }

    const idleInterval = window.setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS)
    const keepAliveInterval = window.setInterval(keepAliveTick, 5 * 60 * 1000)
    checkIdle()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkIdle()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', checkIdle)

    return () => {
      window.clearInterval(idleInterval)
      window.clearInterval(keepAliveInterval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', checkIdle)
    }
  }, [enforceIdle, logout, markActivity])

  return children
}
