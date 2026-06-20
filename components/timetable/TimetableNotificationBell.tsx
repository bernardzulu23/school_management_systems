'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, ChevronRight } from 'lucide-react'

export function TimetableNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [notifications, setNotifications] = useState([])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable/notifications', { cache: 'no-store' })
      const data = await res.json()
      const list = data.notifications || []
      setNotifications(list)
      setUnreadCount(list.filter((n) => !n.read).length)
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 30000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  async function markRead(id) {
    try {
      await fetch('/api/timetable/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      fetchNotifications()
    } catch {}
  }

  async function openNotification(n) {
    await markRead(n.id)
    setShowPanel(false)
    const meta = n?.meta && typeof n.meta === 'object' ? n.meta : {}
    const msg = String(n?.message || '')
    const term =
      String(n?.term || meta?.term || '').trim() ||
      String((msg.match(/\bTerm\s*\d+\b/i) || [])[0] || '').trim()
    const academicYear =
      String(meta?.academicYear || meta?.year || '').trim() ||
      String((msg.match(/\b(20\d{2})\b/) || [])[1] || '').trim()
    const deptRaw = meta?.departments || meta?.department || meta?.dept || null
    const departments = Array.isArray(deptRaw)
      ? deptRaw.map((d) => String(d).trim()).filter(Boolean)
      : typeof deptRaw === 'string'
        ? deptRaw
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean)
        : []

    const qs = new URLSearchParams()
    if (term) qs.set('term', term)
    if (academicYear) qs.set('academicYear', academicYear)
    if (departments.length) qs.set('departments', departments.join(','))
    qs.set('autoGenerate', '1')
    const suffix = qs.toString()
    window.location.href = `/dashboard/headteacher/timetable${suffix ? `?${suffix}` : ''}`
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          background: 'none',
          border: 'none',
          color: '#666666',
          cursor: 'pointer',
          position: 'relative',
          padding: 8,
          zIndex: 10000,
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: '#ef4444',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 4px',
              borderRadius: 10,
              border: '2px solid #EFECE5',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: 320,
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #111111',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 10000,
            marginTop: 8,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #111111',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13 }}>Timetable Alerts</span>
            <button
              onClick={() => setShowPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666666',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Close
            </button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#666666', fontSize: 12 }}>
                No new alerts
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F5F2EB',
                    cursor: 'pointer',
                    background: n.read ? 'transparent' : '#FF3B0010',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    color: '#111111',
                    display: 'block',
                  }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: n.read ? '#666666' : '#111111',
                      }}
                    >
                      {n.title}
                    </span>
                    {!n.read && (
                      <div
                        style={{ width: 6, height: 6, background: '#FF3B00', borderRadius: 10 }}
                      />
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#666666', margin: 0, lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openNotification(n)
                      }}
                      style={{
                        fontSize: 10,
                        color: '#FF3B00',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Open Timetable <ChevronRight size={10} />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
