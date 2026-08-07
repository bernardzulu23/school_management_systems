'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { PlatformShell } from '@/components/platform/PlatformShell'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import toast from 'react-hot-toast'

function severityClass(sev) {
  const s = String(sev || '').toLowerCase()
  if (s === 'critical') return 'bg-red-600 text-white'
  if (s === 'high') return 'bg-orange-500 text-white'
  if (s === 'medium') return 'bg-yellow-300 text-ink'
  return 'bg-blue-500 text-white'
}

function KpiCard({ label, value, danger }) {
  return (
    <div
      className={`border-2 border-ink bg-white p-4 shadow-[2px_2px_0_#111111] ${
        danger && Number(value) > 0 ? 'ring-2 ring-red-500' : ''
      }`}
    >
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${danger && Number(value) > 0 ? 'text-red-600' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

export default function PlatformSecurityPage() {
  const [overview, setOverview] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [attempts, setAttempts] = useState([])
  const [suspicious, setSuspicious] = useState([])
  const [anomalous, setAnomalous] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [oRes, aRes, lRes, sRes, anRes] = await Promise.all([
        sessionFetch('/api/platform/security/overview', { cache: 'no-store' }),
        sessionFetch('/api/platform/security/alerts?resolved=false&limit=20', {
          cache: 'no-store',
        }),
        sessionFetch('/api/platform/security/login-attempts', { cache: 'no-store' }),
        sessionFetch('/api/platform/security/suspicious-ips', { cache: 'no-store' }),
        sessionFetch('/api/platform/audit-logs?action=LOGIN&anomalous=true&limit=20', {
          cache: 'no-store',
        }),
      ])

      const oJson = await oRes.json().catch(() => ({}))
      const aJson = await aRes.json().catch(() => ({}))
      const lJson = await lRes.json().catch(() => ({}))
      const sJson = await sRes.json().catch(() => ({}))
      const anJson = await anRes.json().catch(() => ({}))

      if (!oRes.ok) throw new Error(oJson.error || 'Overview failed')
      setOverview(oJson)
      setAlerts(aJson.items || [])
      setAttempts((lJson.items || []).slice(0, 10))
      setSuspicious(sJson.items || [])
      setAnomalous(anJson.items || [])
    } catch (e) {
      toast.error(e.message || 'Failed to load security data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function resolveAlert(id) {
    try {
      const res = await sessionFetch(`/api/platform/security/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Resolve failed')
      toast.success('Alert resolved')
      await load()
    } catch (e) {
      toast.error(e.message || 'Resolve failed')
    }
  }

  async function blockIp(ip) {
    try {
      const res = await sessionFetch('/api/platform/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, reason: 'Manual block by superadmin' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Block failed')
      toast.success(`Blocked ${ip}`)
      await load()
    } catch (e) {
      toast.error(e.message || 'Block failed')
    }
  }

  return (
    <PlatformShell title="Security">
      {loading && !overview ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Unresolved Alerts (24h)" value={overview?.unresolvedAlerts} danger />
            <KpiCard label="Critical Alerts" value={overview?.criticalAlerts} danger />
            <KpiCard label="Suspicious IPs (7d)" value={overview?.suspiciousIps} />
            <KpiCard label="Schools under attack" value={overview?.schoolsUnderAttack} danger />
          </div>

          <section className="border-2 border-ink bg-white shadow-[2px_2px_0_#111111]">
            <div className="border-b-2 border-ink px-4 py-3 font-semibold">
              Recent Security Alerts
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="text-left bg-paper border-b border-ink/30">
                    <th className="p-2">Time</th>
                    <th className="p-2">School</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">IP</th>
                    <th className="p-2">Country</th>
                    <th className="p-2">Pattern</th>
                    <th className="p-2">Severity</th>
                    <th className="p-2">Resolve</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id} className="border-b border-ink/15">
                      <td className="p-2 whitespace-nowrap">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="p-2">{a.schoolName || '—'}</td>
                      <td className="p-2">{a.email || '—'}</td>
                      <td className="p-2 font-mono">{a.ipAddress || '—'}</td>
                      <td className="p-2">{a.country || '—'}</td>
                      <td className="p-2">{a.pattern}</td>
                      <td className="p-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${severityClass(a.severity)}`}
                        >
                          {a.severity}
                        </span>
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          className="border border-ink px-2 py-0.5 text-xs font-medium hover:bg-paper"
                          onClick={() => resolveAlert(a.id)}
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!alerts.length ? (
                <p className="p-4 text-sm text-muted">No unresolved alerts.</p>
              ) : null}
            </div>
          </section>

          <section className="border-2 border-ink bg-white shadow-[2px_2px_0_#111111]">
            <div className="border-b-2 border-ink px-4 py-3 font-semibold">
              Failed Login Attempts by School (24h)
            </div>
            <ul className="divide-y divide-ink/15">
              {attempts.map((row) => (
                <li
                  key={row.schoolId}
                  className="px-4 py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">{row.schoolName}</p>
                    <p className="text-xs text-muted">{row.subdomain}</p>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    {row.failedCount > 10 ? (
                      <AlertTriangle className="text-red-600" size={16} />
                    ) : null}
                    <span className={row.failedCount > 10 ? 'text-red-600' : ''}>
                      {row.failedCount}
                    </span>
                  </div>
                </li>
              ))}
              {!attempts.length ? (
                <li className="p-4 text-sm text-muted">No failed logins in the last 24 hours.</li>
              ) : null}
            </ul>
          </section>

          <section className="border-2 border-ink bg-white shadow-[2px_2px_0_#111111]">
            <div className="border-b-2 border-ink px-4 py-3 font-semibold">Suspicious IPs</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1000px]">
                <thead>
                  <tr className="text-left bg-paper border-b border-ink/30">
                    <th className="p-2">IP</th>
                    <th className="p-2">Country</th>
                    <th className="p-2">ISP</th>
                    <th className="p-2">VPN</th>
                    <th className="p-2">Tor</th>
                    <th className="p-2">Failed</th>
                    <th className="p-2">Schools</th>
                    <th className="p-2">Last Seen</th>
                    <th className="p-2">Block</th>
                  </tr>
                </thead>
                <tbody>
                  {suspicious.map((row) => (
                    <tr key={row.ip} className="border-b border-ink/15">
                      <td className="p-2 font-mono">{row.ip}</td>
                      <td className="p-2">{row.country || '—'}</td>
                      <td className="p-2">{row.isp || '—'}</td>
                      <td className="p-2">{row.isVpn ? 'Yes' : 'No'}</td>
                      <td className="p-2">{row.isTor ? 'Yes' : 'No'}</td>
                      <td className="p-2">{row.failedAttempts}</td>
                      <td className="p-2">{row.schoolsTargeted}</td>
                      <td className="p-2 whitespace-nowrap">
                        {row.lastSeen ? new Date(row.lastSeen).toLocaleString() : '—'}
                      </td>
                      <td className="p-2">
                        {row.blocked ? (
                          <span className="text-muted">Blocked</span>
                        ) : (
                          <button
                            type="button"
                            className="border border-ink px-2 py-0.5 text-xs font-medium hover:bg-red-50"
                            onClick={() => blockIp(row.ip)}
                          >
                            Block IP
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!suspicious.length ? (
                <p className="p-4 text-sm text-muted">No suspicious IPs yet.</p>
              ) : null}
            </div>
          </section>

          <section className="border-2 border-ink bg-white shadow-[2px_2px_0_#111111]">
            <div className="border-b-2 border-ink px-4 py-3 font-semibold">
              Anomalous Successful Logins
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="text-left bg-paper border-b border-ink/30">
                    <th className="p-2">Time</th>
                    <th className="p-2">School</th>
                    <th className="p-2">User</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">IP</th>
                    <th className="p-2">Country</th>
                    <th className="p-2">VPN/Tor</th>
                    <th className="p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalous.map((row) => (
                    <tr key={row.id} className="border-b border-ink/15 bg-orange-50/40">
                      <td className="p-2 whitespace-nowrap">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="p-2">{row.schoolName || '—'}</td>
                      <td className="p-2">{row.userEmail || row.userName || '—'}</td>
                      <td className="p-2">{row.role || '—'}</td>
                      <td className="p-2 font-mono">{row.ipAddress || '—'}</td>
                      <td className="p-2">{row.country || '—'}</td>
                      <td className="p-2">
                        {[row.isVpn ? 'VPN' : null, row.isTor ? 'Tor' : null]
                          .filter(Boolean)
                          .join('/') || '—'}
                      </td>
                      <td
                        className={`p-2 ${(row.threatScore ?? 0) > 70 ? 'text-red-700 font-bold' : ''}`}
                      >
                        {row.threatScore ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!anomalous.length ? (
                <p className="p-4 text-sm text-muted">No anomalous logins.</p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </PlatformShell>
  )
}
