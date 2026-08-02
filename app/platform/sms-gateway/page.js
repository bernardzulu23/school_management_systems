'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PlatformShell } from '@/components/platform/PlatformShell'
import { sessionFetch } from '@/lib/auth/sessionFetch'

function formatSeen(iso) {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-ink mt-1">{value}</p>
      {sub ? <p className="text-xs text-muted mt-1">{sub}</p> : null}
    </div>
  )
}

export default function PlatformSmsGatewayPage() {
  const router = useRouter()
  const [schools, setSchools] = useState([])
  const [gateways, setGateways] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingGateways, setLoadingGateways] = useState(true)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  const [schoolId, setSchoolId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [enableForSchool, setEnableForSchool] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /** Shown once after register — React state only; never persisted to browser storage. */
  const [issuedToken, setIssuedToken] = useState(null)
  const [issuedMeta, setIssuedMeta] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editEnableSchool, setEditEnableSchool] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [logsGatewayId, setLogsGatewayId] = useState(null)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [logsMeta, setLogsMeta] = useState(null)

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true)
    try {
      const qs = new URLSearchParams({ includeUnpaid: '1' })
      const res = await sessionFetch(`/api/platform/schools?${qs}`, { cache: 'no-store' })
      if (res.status === 401 || res.status === 403) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load schools')
        return
      }
      setSchools(data.schools || [])
    } catch {
      toast.error('Failed to load schools')
    } finally {
      setLoadingSchools(false)
    }
  }, [router])

  const loadGateways = useCallback(async () => {
    setLoadingGateways(true)
    try {
      const res = await sessionFetch('/api/admin/sms-gateway-status', { cache: 'no-store' })
      if (res.status === 401 || res.status === 403) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load gateways')
        return
      }
      setGateways(data.gateways || [])
    } catch {
      toast.error('Failed to load gateways')
    } finally {
      setLoadingGateways(false)
    }
  }, [router])

  const loadMetrics = useCallback(async () => {
    setLoadingMetrics(true)
    try {
      const res = await sessionFetch('/api/admin/sms-gateway-metrics', { cache: 'no-store' })
      if (res.status === 401 || res.status === 403) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load metrics')
        return
      }
      setMetrics(data)
    } catch {
      toast.error('Failed to load metrics')
    } finally {
      setLoadingMetrics(false)
    }
  }, [router])

  const refreshAll = useCallback(() => {
    loadGateways()
    loadMetrics()
  }, [loadGateways, loadMetrics])

  useEffect(() => {
    loadSchools()
    loadGateways()
    loadMetrics()
  }, [loadSchools, loadGateways, loadMetrics])

  const schoolGateways = useMemo(() => {
    if (!schoolId) return []
    return gateways.filter((g) => g.schoolId === schoolId)
  }, [gateways, schoolId])

  const schoolCustomEnabled = useMemo(() => {
    const first = schoolGateways[0]
    return Boolean(first?.customGatewayEnabled)
  }, [schoolGateways])

  const fleetRows = useMemo(() => {
    const monthMap = metrics?.monthSentByGateway || {}
    return gateways.map((g) => ({
      ...g,
      idShort: `${String(g.id || '').slice(0, 8)}…`,
      monthSent: monthMap[g.id] ?? 0,
    }))
  }, [gateways, metrics])

  function startEdit(g) {
    setSchoolId(g.schoolId)
    setEditingId(g.id)
    setEditName(g.deviceName || '')
    setEditActive(Boolean(g.isActive))
    setEditEnableSchool(Boolean(g.customGatewayEnabled))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditActive(true)
    setEditEnableSchool(false)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!schoolId) {
      toast.error('Select a school')
      return
    }
    if (!deviceName.trim()) {
      toast.error('Enter a device name')
      return
    }

    setSubmitting(true)
    setIssuedToken(null)
    setIssuedMeta(null)
    try {
      const res = await sessionFetch('/api/sms/gateway/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          deviceName: deviceName.trim(),
          enableForSchool,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Registration failed')
        return
      }

      const token = String(data.deviceToken || '')
      if (!token) {
        toast.error('No device token returned')
        return
      }

      setIssuedToken(token)
      setIssuedMeta({
        deviceName: data.gateway?.deviceName || deviceName.trim(),
        schoolName: data.gateway?.schoolName || '',
        enabled: Boolean(data.customGatewayEnabled),
      })
      setDeviceName('')
      setEnableForSchool(false)
      toast.success('Gateway registered — copy the token now')
      refreshAll()
    } catch {
      toast.error('Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editingId || !schoolId) return
    if (!editName.trim()) {
      toast.error('Device name cannot be empty')
      return
    }

    setSavingEdit(true)
    try {
      const res = await sessionFetch(`/api/sms/gateway/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          deviceName: editName.trim(),
          isActive: editActive,
          enableForSchool: editEnableSchool,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Update failed')
        return
      }
      toast.success(
        editEnableSchool
          ? 'Gateway updated — custom routing on'
          : 'Gateway updated — Africala fallback (custom flag off)'
      )
      cancelEdit()
      refreshAll()
    } catch {
      toast.error('Update failed')
    } finally {
      setSavingEdit(false)
    }
  }

  async function revokeGateway(g) {
    const sid = g.schoolId || schoolId
    if (!sid) return
    const ok = window.confirm(
      `Revoke gateway “${g.deviceName}”? The pairing token will stop working. Re-register to issue a new token.`
    )
    if (!ok) return

    setDeletingId(g.id)
    try {
      const qs = new URLSearchParams({ schoolId: sid })
      const res = await sessionFetch(`/api/sms/gateway/${g.id}?${qs}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Revoke failed')
        return
      }
      if (editingId === g.id) cancelEdit()
      toast.success('Gateway revoked')
      refreshAll()
    } catch {
      toast.error('Revoke failed')
    } finally {
      setDeletingId(null)
    }
  }

  async function copyToken() {
    if (!issuedToken) return
    try {
      await navigator.clipboard.writeText(issuedToken)
      toast.success('Token copied')
    } catch {
      toast.error('Could not copy — select and copy manually')
    }
  }

  async function openLogs(g) {
    setLogsGatewayId(g.id)
    setLogsMeta({ deviceName: g.deviceName, schoolName: g.schoolName })
    setLogsLoading(true)
    setLogs([])
    try {
      const qs = new URLSearchParams({ gatewayId: g.id, limit: '20' })
      const res = await sessionFetch(`/api/admin/sms-gateway-logs?${qs}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to load logs')
        return
      }
      setLogs(data.logs || [])
    } catch {
      toast.error('Failed to load logs')
    } finally {
      setLogsLoading(false)
    }
  }

  const kpis = metrics?.kpis
  const daily = metrics?.daily || []
  const alerts = metrics?.alerts || []

  function renderGatewayActions(g) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openLogs(g)}
          className="border border-ink px-3 py-1 text-xs font-semibold hover:bg-paper"
        >
          View logs
        </button>
        <button
          type="button"
          onClick={() => startEdit(g)}
          disabled={Boolean(deletingId)}
          className="border border-ink px-3 py-1 text-xs font-semibold hover:bg-paper disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => revokeGateway(g)}
          disabled={deletingId === g.id}
          className="border border-red-700 text-red-800 px-3 py-1 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
        >
          {deletingId === g.id ? 'Revoking…' : 'Revoke'}
        </button>
      </div>
    )
  }

  function renderEditForm() {
    return (
      <form onSubmit={saveEdit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wide text-muted">Device name</span>
          <input
            type="text"
            className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={savingEdit}
            required
          />
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={editActive}
            onChange={(e) => setEditActive(e.target.checked)}
            disabled={savingEdit}
          />
          <span>
            <span className="font-medium text-ink">Device active</span>
            <span className="block text-xs text-muted mt-0.5">
              Inactive devices cannot poll the queue or report status.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={editEnableSchool}
            onChange={(e) => setEditEnableSchool(e.target.checked)}
            disabled={savingEdit}
          />
          <span>
            <span className="font-medium text-ink">Enable custom gateway for this school</span>
            <span className="block text-xs text-muted mt-0.5">
              Uncheck to use Africala fallback (keeps the gateway registered; stops custom routing).
            </span>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={savingEdit}
            className="border-2 border-ink bg-accent text-paper px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          >
            {savingEdit ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={savingEdit}
            className="border-2 border-ink bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <PlatformShell title="SMS Gateway">
      <div className="space-y-8 max-w-6xl">
        <p className="text-sm text-muted">
          Register, monitor, and revoke Android phones used as SIM SMS bridges. Pairing tokens are
          one-time. Turning off &quot;Enable custom gateway&quot; restores the Africala path without
          deleting the device.
        </p>

        {/* Alerts */}
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={`${a.type}-${a.gatewayId || i}`}
                className={`border-2 px-4 py-3 text-sm font-medium ${
                  a.severity === 'error'
                    ? 'border-red-700 bg-red-50 text-red-900'
                    : 'border-amber-700 bg-amber-50 text-amber-950'
                }`}
              >
                {a.message}
              </div>
            ))}
          </div>
        ) : null}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Online / active"
            value={
              loadingMetrics || !kpis ? '…' : `${kpis.onlineGateways} / ${kpis.activeGateways}`
            }
            sub={kpis ? `${kpis.totalGateways} registered` : undefined}
          />
          <KpiCard
            label="Sent this month"
            value={loadingMetrics || !kpis ? '…' : kpis.sentThisMonth}
            sub="AT + gateway"
          />
          <KpiCard
            label="Failure rate today"
            value={loadingMetrics || !kpis ? '…' : `${kpis.failureRateToday}%`}
            sub={
              kpis
                ? `${kpis.todayFailed} failed · ${kpis.todaySent} sent` +
                  (typeof kpis.todayAt === 'number'
                    ? ` · ${kpis.todayAt} AT / ${kpis.todayGateway || 0} SIM`
                    : '')
                : undefined
            }
          />
          <KpiCard
            label="Fleet health"
            value={
              loadingMetrics || !kpis
                ? '…'
                : alerts.length
                  ? `${alerts.length} alert${alerts.length === 1 ? '' : 's'}`
                  : 'OK'
            }
          />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
            <h3 className="text-sm font-semibold text-ink mb-3">7-day volume</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#111111" name="Sent" />
                  <Bar dataKey="failed" fill="#b91c1c" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
            <h3 className="text-sm font-semibold text-ink mb-3">7-day failure rate (%)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="failureRate"
                    stroke="#b45309"
                    strokeWidth={2}
                    name="Failure %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0_#111111] space-y-4 max-w-3xl"
        >
          <h2 className="font-semibold text-ink">Register device</h2>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted">School</span>
            <select
              className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm"
              value={schoolId}
              onChange={(e) => {
                setSchoolId(e.target.value)
                cancelEdit()
              }}
              disabled={loadingSchools || submitting}
              required
            >
              <option value="">{loadingSchools ? 'Loading schools…' : 'Select a school'}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.subdomain ? ` (${s.subdomain})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted">Device name</span>
            <input
              type="text"
              className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm"
              placeholder="Front office Samsung"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={submitting}
              required
            />
          </label>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={enableForSchool}
              onChange={(e) => setEnableForSchool(e.target.checked)}
              disabled={submitting}
            />
            <span>
              <span className="font-medium text-ink">Enable for this school now</span>
              <span className="block text-xs text-muted mt-0.5">
                Off by default. When on, outbound SMS for this school queues to the Android gateway
                instead of Africala.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || loadingSchools}
            className="border-2 border-ink bg-accent text-paper px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#111111] disabled:opacity-50"
          >
            {submitting ? 'Registering…' : 'Register gateway'}
          </button>
        </form>

        {issuedToken ? (
          <div className="border-2 border-amber-700 bg-amber-50 p-6 shadow-[4px_4px_0_#111111] space-y-3 max-w-3xl">
            <p className="font-semibold text-amber-950">Device token — copy now</p>
            <p className="text-sm text-amber-900">
              This token will not be shown again — copy it now before leaving this page.
              {issuedMeta?.schoolName ? ` Registered for ${issuedMeta.schoolName}` : ''}
              {issuedMeta?.deviceName ? ` (${issuedMeta.deviceName})` : ''}.
              {issuedMeta?.enabled
                ? ' Custom gateway is enabled for this school.'
                : ' Custom gateway flag left off — enable later when ready.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="shrink-0 space-y-2">
                <p className="text-xs font-medium text-amber-950">
                  Scan with the Android gateway app
                </p>
                <div
                  className="inline-flex items-center justify-center border-2 border-ink bg-white p-4"
                  style={{ width: 252, height: 252, backgroundColor: '#ffffff' }}
                >
                  <QRCodeSVG
                    value={issuedToken}
                    size={220}
                    level="M"
                    marginSize={2}
                    fgColor="#000000"
                    bgColor="#ffffff"
                    title="SMS gateway pairing token"
                    style={{ width: 220, height: 220, display: 'block' }}
                  />
                </div>
              </div>
              <div className="flex-1 space-y-3 min-w-0 w-full">
                <pre className="bg-white border-2 border-ink p-3 text-xs break-all whitespace-pre-wrap font-mono">
                  {issuedToken}
                </pre>
                <button
                  type="button"
                  onClick={copyToken}
                  className="border-2 border-ink bg-ink text-paper px-4 py-2 text-sm font-semibold"
                >
                  Copy to clipboard
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Fleet table / cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-ink">All gateways</h2>
            <button
              type="button"
              onClick={refreshAll}
              className="text-xs border border-ink px-2 py-1 hover:bg-paper"
              disabled={loadingGateways || loadingMetrics}
            >
              Refresh
            </button>
          </div>

          {loadingGateways ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : fleetRows.length === 0 ? (
            <p className="text-muted text-sm">No gateways registered yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto border-2 border-ink bg-white shadow-[3px_3px_0_#111111]">
                <table className="min-w-full text-sm">
                  <thead className="bg-paper border-b-2 border-ink">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase">School</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Device</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">ID</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Month sent</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Last seen</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Routing</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleetRows.map((g) => (
                      <tr key={g.id} className="border-t border-ink/20 align-top">
                        <td className="px-3 py-3">
                          <div className="font-medium">{g.schoolName}</div>
                          <div className="text-xs text-muted">{g.subdomain || ''}</div>
                        </td>
                        <td className="px-3 py-3">{g.deviceName}</td>
                        <td className="px-3 py-3 font-mono text-xs">{g.idShort}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-xs font-semibold uppercase px-2 py-0.5 border ${
                              g.phoneStatus === 'online'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-red-100 text-red-800 border-red-300'
                            }`}
                          >
                            {g.phoneStatus}
                            {!g.isActive ? ' · inactive' : ''}
                          </span>
                        </td>
                        <td className="px-3 py-3">{g.monthSent}</td>
                        <td className="px-3 py-3 text-xs">{formatSeen(g.lastSeenAt)}</td>
                        <td className="px-3 py-3 text-xs">
                          {g.customGatewayEnabled ? 'Custom on' : 'Africala fallback'}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === g.id ? renderEditForm() : renderGatewayActions(g)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="md:hidden space-y-3">
                {fleetRows.map((g) => (
                  <li
                    key={g.id}
                    className="border-2 border-ink bg-white p-4 shadow-[2px_2px_0_#111111] text-sm space-y-3"
                  >
                    {editingId === g.id ? (
                      renderEditForm()
                    ) : (
                      <>
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="font-medium text-ink">{g.deviceName}</p>
                            <p className="text-xs text-muted">
                              {g.schoolName}
                              {g.subdomain ? ` · ${g.subdomain}` : ''}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-semibold uppercase px-2 py-0.5 border h-fit ${
                              g.phoneStatus === 'online'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-red-100 text-red-800 border-red-300'
                            }`}
                          >
                            {g.phoneStatus}
                          </span>
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-xs text-muted">
                          <div>
                            <dt className="uppercase">ID</dt>
                            <dd className="text-ink font-mono">{g.idShort}</dd>
                          </div>
                          <div>
                            <dt className="uppercase">Month sent</dt>
                            <dd className="text-ink">{g.monthSent}</dd>
                          </div>
                          <div>
                            <dt className="uppercase">Last seen</dt>
                            <dd className="text-ink">{formatSeen(g.lastSeenAt)}</dd>
                          </div>
                          <div>
                            <dt className="uppercase">Routing</dt>
                            <dd className="text-ink">
                              {g.customGatewayEnabled ? 'Custom on' : 'Africala fallback'}
                            </dd>
                          </div>
                        </dl>
                        {renderGatewayActions(g)}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Selected-school detail (kept for register context) */}
        {schoolId ? (
          <section className="space-y-2 max-w-3xl">
            <h2 className="font-semibold text-ink text-sm">
              Selected school routing:{' '}
              {schoolCustomEnabled ? 'custom gateway enabled' : 'custom gateway off (Africala)'}
            </h2>
            <p className="text-xs text-muted">
              {schoolGateways.length} gateway(s) for this school.
            </p>
          </section>
        ) : null}

        {/* Logs modal */}
        {logsGatewayId ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white border-2 border-ink shadow-[6px_6px_0_#111111] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-ink">
                <div>
                  <h3 className="font-semibold text-ink">Delivery logs</h3>
                  <p className="text-xs text-muted">
                    {logsMeta?.deviceName}
                    {logsMeta?.schoolName ? ` · ${logsMeta.schoolName}` : ''}
                    {' · AT + gateway'}
                  </p>
                </div>
                <button
                  type="button"
                  className="border border-ink px-2 py-1 text-xs font-semibold"
                  onClick={() => {
                    setLogsGatewayId(null)
                    setLogs([])
                  }}
                >
                  Close
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                {logsLoading ? (
                  <p className="text-sm text-muted">Loading…</p>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted">No delivery logs for this school yet.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted border-b">
                        <th className="py-1 pr-2">Status</th>
                        <th className="py-1 pr-2">Recipient</th>
                        <th className="py-1 pr-2">Channel</th>
                        <th className="py-1">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id} className="border-b border-ink/10">
                          <td className="py-2 pr-2 whitespace-nowrap">
                            {l.status}
                            {l.failureReason ? (
                              <span className="block text-xs text-red-700 max-w-[12rem] truncate">
                                {l.failureReason}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">{l.recipient || '—'}</td>
                          <td className="py-2 pr-2 whitespace-nowrap text-xs">
                            {l.channel || l.provider || '—'}
                          </td>
                          <td className="py-2 whitespace-nowrap text-xs">
                            {formatSeen(l.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PlatformShell>
  )
}
