'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Check, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatNotificationType } from '@/lib/notifications/clientWebPush'
import toast from 'react-hot-toast'

function formatWhen(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

/**
 * Full inbox for /dashboard/notifications
 */
export function NotificationCenter({ compact = false }) {
  const router = useRouter()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [query, setQuery] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const qs = new URLSearchParams({
        limit: compact ? '20' : '50',
        offset: '0',
        status: status === 'unread' ? 'unread' : 'all',
      })
      const res = await fetch(`/api/notifications/list?${qs}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load notifications')
      setRows(json.data || [])
      setUnreadCount(json.pagination?.unreadCount || 0)
    } catch (error) {
      toast.error(error.message || 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }, [compact, status])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (typeFilter && row.type !== typeFilter) return false
      if (!q) return true
      return (
        String(row.title || '')
          .toLowerCase()
          .includes(q) ||
        String(row.message || '')
          .toLowerCase()
          .includes(q)
      )
    })
  }, [rows, query, typeFilter])

  const markRead = async (id) => {
    try {
      setBusyId(id)
      const res = await fetch(`/api/notifications/${id}/mark-read`, {
        method: 'PATCH',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not mark as read')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not mark as read')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this notification?')) return
    try {
      setBusyId(id)
      const res = await fetch(`/api/notifications/${id}/mark-read`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not delete')
      toast.success('Deleted')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not delete')
    } finally {
      setBusyId(null)
    }
  }

  const openRow = async (row) => {
    if (!row.readAt) await markRead(row.id)
    if (row.actionUrl) {
      router.push(row.actionUrl)
    }
  }

  const types = useMemo(() => {
    const set = new Set(rows.map((r) => r.type).filter(Boolean))
    return Array.from(set)
  }, [rows])

  return (
    <div className="space-y-4">
      {!compact ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
              <Bell className="h-7 w-7 text-royalPurple-accentTx" />
              Notifications
            </h1>
            <p className="text-sm text-royalPurple-text2 mt-1">
              {unreadCount} unread · Manage delivery in{' '}
              <Link href="/dashboard/settings?tab=notifications" className="underline">
                Settings
              </Link>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <Button
          size="sm"
          variant={status === 'all' ? 'default' : 'outline'}
          onClick={() => setStatus('all')}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={status === 'unread' ? 'default' : 'outline'}
          onClick={() => setStatus('unread')}
        >
          Unread
        </Button>
        {!compact ? (
          <>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-royalPurple-text3" />
              <input
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 pl-8 pr-3 py-1.5 text-sm"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-2 py-1.5 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {formatNotificationType(t)}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-royalPurple-text2 py-6 text-center">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-royalPurple-border rounded-lg border border-royalPurple-border bg-royalPurple-card1">
          {filtered.map((row) => {
            const unread = !row.readAt
            return (
              <li key={row.id} className={`p-3 sm:p-4 ${unread ? 'bg-royalPurple-card2/40' : ''}`}>
                <div className="flex gap-3 justify-between">
                  <button
                    type="button"
                    className="text-left flex-1 min-w-0"
                    onClick={() => openRow(row)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {unread ? (
                        <span className="h-2 w-2 rounded-full bg-royalPurple-accentTx shrink-0" />
                      ) : null}
                      <span className="font-medium text-royalPurple-text1 truncate">
                        {row.title}
                      </span>
                      <span className="text-xs text-royalPurple-text3">
                        {formatNotificationType(row.type)}
                      </span>
                    </div>
                    <p className="text-sm text-royalPurple-text2 mt-1 line-clamp-2">
                      {row.message}
                    </p>
                    <p className="text-xs text-royalPurple-text3 mt-1">
                      {formatWhen(row.createdAt)}
                    </p>
                  </button>
                  <div className="flex flex-col gap-1 shrink-0">
                    {unread ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === row.id}
                        onClick={() => markRead(row.id)}
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {!compact ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === row.id}
                        onClick={() => remove(row.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {compact ? (
        <div className="text-center pt-1">
          <Link
            href="/dashboard/notifications"
            className="text-sm text-royalPurple-accentTx hover:underline"
          >
            Open notification center
          </Link>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Header dropdown panel (used by NotificationBadge).
 */
export function NotificationCenterPanel({ open, onClose }) {
  if (!open) return null
  return (
    <div className="absolute right-0 top-full mt-2 w-[min(100vw-1.5rem,22rem)] z-[10000] rounded-xl border border-royalPurple-border bg-royalPurple-card1 shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-royalPurple-border">
        <span className="font-medium text-royalPurple-text1 text-sm">Notifications</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-royalPurple-card2 text-royalPurple-text2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-2">
        <NotificationCenter compact />
      </div>
    </div>
  )
}
