'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PlatformShell } from '@/components/platform/PlatformShell'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import toast from 'react-hot-toast'

function toLocalInputValue(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultRange() {
  const to = new Date()
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return { from: toLocalInputValue(from), to: toLocalInputValue(to) }
}

function truncateUa(ua, n = 48) {
  const s = String(ua || '')
  return s.length <= n ? s : `${s.slice(0, n)}…`
}

function rowClass(row) {
  if (row.action === 'LOGIN_FAILED') return 'bg-red-50'
  if (row.isVpn || row.isTor) return 'bg-orange-50'
  return ''
}

export default function PlatformAuditLogsPage() {
  const initial = useMemo(() => defaultRange(), [])
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [schoolId, setSchoolId] = useState('')
  const [action, setAction] = useState('ALL')
  const [country, setCountry] = useState('')
  const [vpnOnly, setVpnOnly] = useState(false)
  const [schools, setSchools] = useState([])
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await sessionFetch('/api/platform/schools?includeUnpaid=1', {
          cache: 'no-store',
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) setSchools(data.schools || data.items || [])
      } catch {
        // ignore
      }
    })()
  }, [])

  const load = useCallback(
    async (pageCursor = null, append = false) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (from) params.set('from', new Date(from).toISOString())
        if (to) params.set('to', new Date(to).toISOString())
        if (schoolId) params.set('schoolId', schoolId)
        if (action && action !== 'ALL') params.set('action', action)
        if (country.trim()) params.set('country', country.trim())
        if (vpnOnly) params.set('vpnOnly', 'true')
        params.set('limit', '50')
        if (pageCursor) params.set('cursor', pageCursor)

        const res = await sessionFetch(`/api/platform/audit-logs?${params}`, {
          cache: 'no-store',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to load audit logs')
        setItems((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []))
        setNextCursor(data.nextCursor || null)
        setCursor(pageCursor)
      } catch (e) {
        toast.error(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    },
    [from, to, schoolId, action, country, vpnOnly]
  )

  useEffect(() => {
    load(null, false)
  }, [load])

  return (
    <PlatformShell title="Audit Logs">
      <div className="space-y-4">
        <div className="border-2 border-ink bg-white p-4 shadow-[2px_2px_0_#111111] grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs space-y-1">
            <span className="font-medium">From</span>
            <input
              type="datetime-local"
              className="w-full border border-ink px-2 py-1 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-medium">To</span>
            <input
              type="datetime-local"
              className="w-full border border-ink px-2 py-1 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-medium">School</span>
            <select
              className="w-full border border-ink px-2 py-1 text-sm"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            <span className="font-medium">Action</span>
            <select
              className="w-full border border-ink px-2 py-1 text-sm"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="ALL">ALL</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            </select>
          </label>
          <label className="text-xs space-y-1">
            <span className="font-medium">Country</span>
            <input
              className="w-full border border-ink px-2 py-1 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. ZM"
            />
          </label>
          <label className="text-xs flex items-end gap-2 pb-1">
            <input
              type="checkbox"
              checked={vpnOnly}
              onChange={(e) => setVpnOnly(e.target.checked)}
            />
            <span className="font-medium">VPN/Tor only</span>
          </label>
        </div>

        <div className="border-2 border-ink bg-white shadow-[2px_2px_0_#111111] overflow-x-auto">
          {loading && !items.length ? (
            <p className="p-4 text-sm text-muted">Loading…</p>
          ) : (
            <table className="w-full text-xs min-w-[1100px]">
              <thead>
                <tr className="border-b-2 border-ink text-left bg-paper">
                  <th className="p-2">Time</th>
                  <th className="p-2">School</th>
                  <th className="p-2">User Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">IP Address</th>
                  <th className="p-2">Country</th>
                  <th className="p-2">City</th>
                  <th className="p-2">VPN/Tor</th>
                  <th className="p-2">Threat Score</th>
                  <th className="p-2">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className={`border-b border-ink/20 ${rowClass(row)}`}>
                    <td className="p-2 whitespace-nowrap">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="p-2">{row.schoolName || '—'}</td>
                    <td className="p-2">{row.userEmail || '—'}</td>
                    <td className="p-2">{row.role || '—'}</td>
                    <td className="p-2 font-medium">{row.action}</td>
                    <td className="p-2 font-mono">{row.ipAddress || '—'}</td>
                    <td className="p-2">{row.country || '—'}</td>
                    <td className="p-2">{row.city || '—'}</td>
                    <td className="p-2">
                      {row.isVpn || row.isTor
                        ? [row.isVpn ? 'VPN' : null, row.isTor ? 'Tor' : null]
                            .filter(Boolean)
                            .join('/')
                        : '—'}
                    </td>
                    <td
                      className={`p-2 ${
                        (row.threatScore ?? 0) > 70 ? 'text-red-700 font-bold' : ''
                      }`}
                    >
                      {row.threatScore ?? '—'}
                    </td>
                    <td className="p-2" title={row.userAgent || ''}>
                      {truncateUa(row.userAgent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !items.length ? (
            <p className="p-4 text-sm text-muted">No audit events in this range.</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="border-2 border-ink px-3 py-1 text-sm font-medium disabled:opacity-40"
            disabled={!nextCursor || loading}
            onClick={() => load(nextCursor, true)}
          >
            Load more
          </button>
          {cursor ? (
            <button
              type="button"
              className="border-2 border-ink px-3 py-1 text-sm"
              onClick={() => load(null, false)}
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>
    </PlatformShell>
  )
}
