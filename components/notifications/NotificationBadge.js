'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { NotificationCenterPanel } from '@/components/notifications/NotificationCenter'

/**
 * Header bell with unread badge and dropdown inbox.
 */
export function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/notifications/list?limit=1&status=unread', {
          credentials: 'include',
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) {
          setUnreadCount(json.pagination?.unreadCount || 0)
        }
      } catch {
        /* ignore */
      }
    }
    load()
    const timer = setInterval(load, 30000)
    const onRefresh = () => load()
    window.addEventListener('zsms:notifications-refresh', onRefresh)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('zsms:notifications-refresh', onRefresh)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 min-w-[1.1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-royalPurple-deep">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
      <NotificationCenterPanel open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
