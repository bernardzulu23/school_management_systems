'use client'

import { useCallback, useEffect, useState } from 'react'
import { History, Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULE_LABELS } from '@/lib/changelog/constants'

function formatWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(iso)
  }
}

export default function ActivityChangeLogPage() {
  const [entries, setEntries] = useState([])
  const [actors, setActors] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scope, setScope] = useState('school')
  const [nextCursor, setNextCursor] = useState(null)
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    actorUserId: '',
    module: '',
    action: '',
    q: '',
  })

  const loadMeta = useCallback(async () => {
    const res = await fetch('/api/changelog?meta=1', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setActors(data.actors || [])
    setModules(data.modules || [])
    setScope(data.scope || 'school')
  }, [])

  const loadEntries = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      setLoading(true)
      setError('')
      try {
        const qs = new URLSearchParams()
        qs.set('take', '50')
        if (filters.from) qs.set('from', filters.from)
        if (filters.to) qs.set('to', filters.to)
        if (filters.actorUserId) qs.set('actorUserId', filters.actorUserId)
        if (filters.module) qs.set('module', filters.module)
        if (filters.action) qs.set('action', filters.action)
        if (filters.q) qs.set('q', filters.q)
        if (cursor) qs.set('cursor', cursor)

        const res = await fetch(`/api/changelog?${qs}`, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || 'Could not load activity log')
          if (!append) setEntries([])
          return
        }
        setScope(data.scope || 'school')
        setNextCursor(data.nextCursor || null)
        setEntries((prev) => (append ? [...prev, ...(data.entries || [])] : data.entries || []))
      } catch (err) {
        setError(err?.message || 'Network error')
      } finally {
        setLoading(false)
      }
    },
    [filters]
  )

  useEffect(() => {
    loadMeta().catch(() => {})
  }, [loadMeta])

  useEffect(() => {
    loadEntries().catch(() => {})
  }, [loadEntries])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-royalPurple-text1 flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity log
          </h1>
          <p className="text-sm text-royalPurple-text2 mt-1">
            Read-only trail of create, update, delete, and publish actions across ZSMS.
            {scope === 'department'
              ? ' Showing your department’s tagged activity only.'
              : ' School-wide for administrators and headteachers.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => loadEntries()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-lg border border-royalPurple-border/40 p-3 bg-royalPurple-card/20">
        <label className="block text-xs">
          <span className="font-semibold text-royalPurple-text3 uppercase">From</span>
          <input
            type="date"
            className="zsms-input w-full mt-1"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-royalPurple-text3 uppercase">To</span>
          <input
            type="date"
            className="zsms-input w-full mt-1"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-royalPurple-text3 uppercase">User</span>
          <select
            className="zsms-select w-full mt-1"
            value={filters.actorUserId}
            disabled={scope === 'department'}
            onChange={(e) => setFilters((f) => ({ ...f, actorUserId: e.target.value }))}
          >
            <option value="">Anyone</option>
            {actors.map((a) => (
              <option key={a.actorUserId} value={a.actorUserId}>
                {a.actorLabel || a.actorName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-royalPurple-text3 uppercase">Module</span>
          <select
            className="zsms-select w-full mt-1"
            value={filters.module}
            onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))}
          >
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-royalPurple-text3 uppercase">Action</span>
          <select
            className="zsms-select w-full mt-1"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          >
            <option value="">All actions</option>
            {Object.values(CHANGE_LOG_ACTIONS).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs sm:col-span-2 lg:col-span-1">
          <span className="font-semibold text-royalPurple-text3 uppercase">Search</span>
          <div className="relative mt-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-royalPurple-text3" />
            <input
              type="search"
              className="zsms-input w-full pl-8"
              placeholder="Name, summary, entity…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-400 border border-red-500/30 rounded-md px-3 py-2">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {loading && !entries.length ? (
          <li className="flex items-center gap-2 text-sm text-royalPurple-text2 py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
          </li>
        ) : null}
        {!loading && !entries.length ? (
          <li className="text-sm text-royalPurple-text2 py-8 text-center">
            No activity matches these filters yet. New writes from hooked modules (timetable
            publish, fees payments, attendance sessions, student deletes) will appear here.
          </li>
        ) : null}
        {entries.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-royalPurple-border/40 bg-royalPurple-card/30 px-3 py-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-royalPurple-text1">{e.summary}</p>
              <time className="text-xs text-royalPurple-text3 whitespace-nowrap">
                {formatWhen(e.createdAt)}
              </time>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-royalPurple-text3">
              <span className="rounded bg-royalPurple-bg2/60 px-1.5 py-0.5">{e.actorLabel}</span>
              <span className="rounded bg-royalPurple-bg2/60 px-1.5 py-0.5">
                {CHANGE_LOG_MODULE_LABELS[e.module] || e.module}
              </span>
              <span className="rounded bg-royalPurple-bg2/60 px-1.5 py-0.5">{e.action}</span>
              <span className="rounded bg-royalPurple-bg2/60 px-1.5 py-0.5">{e.entityLabel}</span>
            </div>
          </li>
        ))}
      </ul>

      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => loadEntries({ append: true, cursor: nextCursor })}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  )
}
