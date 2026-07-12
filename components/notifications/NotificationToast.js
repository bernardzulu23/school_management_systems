'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatNotificationType } from '@/lib/notifications/clientWebPush'

const SEEN_KEY = 'zsms-notif-seen-ids'

function readSeen() {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeSeen(set) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set).slice(-200)))
  } catch {
    /* ignore */
  }
}

/**
 * Polls for new unread notifications and shows a toast (auto-dismiss ~5s).
 */
export function NotificationToast() {
  const router = useRouter()
  const primed = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/notifications/list?limit=10&status=unread', {
          credentials: 'include',
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return

        const rows = json.data || []
        const seen = readSeen()

        if (!primed.current) {
          rows.forEach((r) => seen.add(r.id))
          writeSeen(seen)
          primed.current = true
          return
        }

        for (const row of rows) {
          if (seen.has(row.id)) continue
          seen.add(row.id)
          toast.custom(
            (t) => (
              <button
                type="button"
                className="max-w-sm w-full text-left rounded-lg border border-royalPurple-border bg-royalPurple-card1 p-3 shadow-lg"
                onClick={() => {
                  toast.dismiss(t.id)
                  window.dispatchEvent(new Event('zsms:notifications-refresh'))
                  if (row.actionUrl) router.push(row.actionUrl)
                  else router.push('/dashboard/notifications')
                }}
              >
                <p className="text-xs text-royalPurple-text3">{formatNotificationType(row.type)}</p>
                <p className="font-medium text-royalPurple-text1 text-sm mt-0.5">{row.title}</p>
                <p className="text-sm text-royalPurple-text2 line-clamp-2 mt-1">{row.message}</p>
                <p className="text-xs text-royalPurple-accentTx mt-2">View details</p>
              </button>
            ),
            { duration: 5000, id: `notif-${row.id}` }
          )
        }
        writeSeen(seen)
      } catch {
        /* ignore */
      }
    }

    poll()
    const timer = setInterval(poll, 25000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [router])

  return null
}
