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
  const [gateways, setGateways] = useState([])
  const [enabledSchoolCount, setEnabledSchoolCount] = useState(0)
  const [totalSchools, setTotalSchools] = useState(0)
  const [metrics, setMetrics] = useState(null)
  const [loadingGateways, setLoadingGateways] = useState(true)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  const [deviceName, setDeviceName] = useState('Primary SMS Gateway')
  const [enableForAllSchools, setEnableForAllSchools] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  /** Shown once after register â€” React state only; never persisted to browser storage. */
  const [issuedToken, setIssuedToken] = useState(null)
  const [issuedMeta, setIssuedMeta] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editEnableAll, setEditEnableAll] = useState(true)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [logsGatewayId, setLogsGatewayId] = useState(null)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [logsMeta, setLogsMeta] = useState(null)

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
      setEnabledSchoolCount(Number(data.enabledSchoolCount || 0))
      setTotalSchools(Number(data.totalSchools || 0))
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
    loadGateways()
    loadMetrics()
  }, [loadGateways, loadMetrics])

  const fleetRows = useMemo(() => {
    const monthMap = metrics?.monthSentByGateway || {}
    return gateways.map((g) => ({
      ...g,
      idShort: `${String(g.id || '').slice(0, 8)}â€¦`,
      monthSent: monthMap[g.id] ?? 0,
    }))
  }, [gateways, metrics])

  function startEdit(g) {
    setEditingId(g.id)
    setEditName(g.deviceName || '')
    setEditActive(Boolean(g.isActive))
    setEditEnableAll(Boolean(g.customGatewayEnabled) || enabledSchoolCount > 0)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditActive(true)
    setEditEnableAll(true)
  }

  async function onSubmit(e) {
    e.preventDefault()
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
          deviceName: deviceName.trim(),
          enableForAllSchools,
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
        enabledCount: data.enabledSchoolCount || 0,
        enabled: Boolean(data.customGatewayEnabled),
      })
      setDeviceName('Primary SMS Gateway')
      toast.success('Shared gateway registered â€” copy the token now')
      refreshAll()
    } catch {
      toast.error('Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editingId) return
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
          deviceName: editName.trim(),
          isActive: editActive,
          enableForAllSchools: editEnableAll,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Update failed')
        return
      }
      toast.success(
        editEnableAll
          ? `Routing enabled for ${data.enabledSchoolCount ?? 'all'} schools`
          : 'Africala fallback â€” custom gateway flags off (device kept)'
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
    const ok = window.confirm(
      `Revoke gateway â€œ${g.deviceName}â€? The pairing token will stop working. Re-register to issue a new token.`
    )
    if (!ok) return

    setDeletingId(g.id)
    try {
      const res = await sessionFetch(`/api/sms/gateway/${g.id}`, {
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
      toast.error('Could not copy â€” select and copy manually')
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
          {deletingId === g.id ? 'Revokingâ€¦' : 'Revoke'}
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
            checked={editEnableAll}
            onChange={(e) => setEditEnableAll(e.target.checked)}
            disabled={savingEdit}
          />
          <span>
            <span className="font-medium text-ink">Enable for all schools</span>
            <span className="block text-xs text-muted mt-0.5">
              Uncheck to use Africala fallback for every school (keeps the gateway registered).
            </span>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={savingEdit}
            className="border-2 border-ink bg-accent text-paper px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          >
            {savingEdit ? 'Savingâ€¦' : 'Save'}
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
          One shared Android phone serves all schools. Pair once, enable routing for every school,
          and they all show Connected from the same <code className="text-xs">lastSeenAt</code>.
          Rate limit: 100 SMS / 5 min on this phone (shared fleet). Turning off &quot;Enable for all
          schools&quot; restores Africala without deleting the device.
        </p>

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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Online / active"
            value={
              loadingMetrics || !kpis ? 'â€¦' : `${kpis.onlineGateways} / ${kpis.activeGateways}`
            }
            sub={kpis ? `${kpis.totalGateways} registered` : undefined}
          />
          <KpiCard
            label="Schools enabled"
            value={loadingGateways ? 'â€¦' : `${enabledSchoolCount} / ${totalSchools || 'â€”'}`}
            sub="customGatewayEnabled"
          />
          <KpiCard
            label="Sent this month"
            value={loadingMetrics || !kpis ? 'â€¦' : kpis.sentThisMonth}
            sub="CUSTOM_GATEWAY"
          />
          <KpiCard
            label="Failure rate today"
            value={loadingMetrics || !kpis ? 'â€¦' : `${kpis.failureRateToday}%`}
            sub={kpis ? `${kpis.todayFailed} failed Â· ${kpis.todaySent} sent` : undefined}
          />
        </div>

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
          <h2 className="font-semibold text-ink">Register shared gateway</h2>
          <p className="text-xs text-muted">
            Creates one platform device. Prior shared gateways are deactivated. Pair the phone with
            the token/QR once â€” all enabled schools share that queue.
          </p>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted">Device name</span>
            <input
              type="text"
              className="w-full border-2 border-ink bg-paper px-3 py-2 text-sm"
              placeholder="Primary Airtel Gateway"
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
              checked={enableForAllSchools}
              onChange={(e) => setEnableForAllSchools(e.target.checked)}
              disabled={submitting}
            />
            <span>
              <span className="font-medium text-ink">Enable for all schools now</span>
              <span className="block text-xs text-muted mt-0.5">
                Turns on custom gateway routing for every school. Uncheck to register the phone
                first and enable routing later.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="border-2 border-ink bg-accent text-paper px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#111111] disabled:opacity-50"
          >
            {submitting ? 'Registeringâ€¦' : 'Register shared gateway'}
          </button>
        </form>

        {issuedToken ? (
          <div className="border-2 border-amber-700 bg-amber-50 p-6 shadow-[4px_4px_0_#111111] space-y-3 max-w-3xl">
            <p className="font-semibold text-amber-950">Device token â€” copy now</p>
            <p className="text-sm text-amber-900">
              This token will not be shown again.
              {issuedMeta?.deviceName ? ` Registered as ${issuedMeta.deviceName}.` : ''}
              {issuedMeta?.enabled
                ? ` Custom routing enabled for ${issuedMeta.enabledCount} school(s).`
                : ' Custom routing left off â€” enable later when ready.'}
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

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-ink">Gateways</h2>
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
            <p className="text-muted text-sm">Loadingâ€¦</p>
          ) : fleetRows.length === 0 ? (
            <p className="text-muted text-sm">No gateways registered yet.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto border-2 border-ink bg-white shadow-[3px_3px_0_#111111]">
                <table className="min-w-full text-sm">
                  <thead className="bg-paper border-b-2 border-ink">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase">Scope</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Device</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">ID</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Schools</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Month sent</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Last seen</th>
                      <th className="px-3 py-2 text-left text-xs uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleetRows.map((g) => (
                      <tr key={g.id} className="border-t border-ink/20 align-top">
                        <td className="px-3 py-3">
                          <div className="font-medium">{g.schoolName}</div>
                          <div className="text-xs text-muted">
                            {g.isShared ? 'Shared platform' : g.subdomain || 'Legacy'}
                          </div>
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
                            {!g.isActive ? ' Â· inactive' : ''}
                          </span>
                        </td>
                        <td className="px-3 py-3">{g.connectedSchoolCount ?? 'â€”'}</td>
                        <td className="px-3 py-3">{g.monthSent}</td>
                        <td className="px-3 py-3 text-xs">{formatSeen(g.lastSeenAt)}</td>
                        <td className="px-3 py-3">
                          {editingId === g.id ? renderEditForm() : renderGatewayActions(g)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
                            <p className="text-xs text-muted">{g.schoolName}</p>
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
                            <dt className="uppercase">Schools</dt>
                            <dd className="text-ink">{g.connectedSchoolCount ?? 'â€”'}</dd>
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
                            <dt className="uppercase">ID</dt>
                            <dd className="text-ink font-mono">{g.idShort}</dd>
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

        {logsGatewayId ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white border-2 border-ink shadow-[6px_6px_0_#111111] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-ink">
                <div>
                  <h3 className="font-semibold text-ink">Gateway logs</h3>
                  <p className="text-xs text-muted">
                    {logsMeta?.deviceName}
                    {logsMeta?.schoolName ? ` Â· ${logsMeta.schoolName}` : ''}
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
                  <p className="text-sm text-muted">Loadingâ€¦</p>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted">No CUSTOM_GATEWAY logs for this device.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted border-b">
                        <th className="py-1 pr-2">Status</th>
                        <th className="py-1 pr-2">Recipient</th>
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
                          <td className="py-2 pr-2 whitespace-nowrap">{l.recipient || 'â€”'}</td>
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
