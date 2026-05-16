'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

/**
 * Admin / headteacher bell for HOD-submitted department allocations.
 */
export function AllocationNotificationBell({ onOpenAllocations }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [notifications, setNotifications] = useState([])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      const list = Array.isArray(data.notifications) ? data.notifications : []
      setNotifications(list)
      setUnreadCount(list.filter((n) => !n.read).length)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 30000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  async function markRead(id) {
    try {
      await fetch(`/api/admin/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
      })
      fetchNotifications()
    } catch {
      /* ignore */
    }
  }

  async function openNotification(n) {
    await markRead(n.id)
    setShowPanel(false)
    if (typeof onOpenAllocations === 'function') {
      onOpenAllocations(n)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPanel(!showPanel)}
        className="relative inline-flex items-center justify-center rounded-full border border-royalPurple-border/40 bg-royalPurple-card/40 px-3 py-2 text-royalPurple-text2 hover:bg-royalPurple-card/60"
        aria-label="Allocation notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {showPanel ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-royalPurple-border/40 bg-white shadow-xl"
          role="dialog"
        >
          <div className="p-3 border-b border-royalPurple-border/30">
            <p className="text-sm font-bold text-slate-900">HOD allocation submissions</p>
            <p className="text-xs text-slate-500">
              Approve to apply for master timetable generation
            </p>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No notifications</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`w-full text-left px-3 py-3 hover:bg-slate-50 ${n.read ? 'opacity-70' : 'bg-purple-50/50'}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {n.allocation?.department?.name || 'Department'} allocation
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      From {n.allocation?.createdBy?.name || 'HOD'} ·{' '}
                      {String(n.allocation?.status || 'SUBMITTED')}
                    </p>
                    {!n.read ? (
                      <span className="inline-block mt-1 text-[10px] font-bold text-purple-700 uppercase">
                        Review required
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
