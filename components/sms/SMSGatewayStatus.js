'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'

function formatSeen(iso) {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

function statusBadge(status) {
  if (status === 'connected') {
    return {
      label: 'Connected',
      className: 'bg-emerald-500/15 text-emerald-800 border-emerald-400',
      Icon: CheckCircle2,
    }
  }
  if (status === 'offline') {
    return {
      label: 'Offline',
      className: 'bg-amber-500/15 text-amber-900 border-amber-400',
      Icon: WifiOff,
    }
  }
  return {
    label: 'Not configured',
    className: 'bg-royalPurple-page text-royalPurple-text2 border-royalPurple-border',
    Icon: AlertTriangle,
  }
}

export default function SMSGatewayStatus() {
  const [info, setInfo] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [infoRes, logsRes] = await Promise.all([
        fetch('/api/sms/gateway/info', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/sms/logs?limit=20', { credentials: 'include', cache: 'no-store' }),
      ])
      const infoJson = await infoRes.json().catch(() => ({}))
      const logsJson = await logsRes.json().catch(() => ({}))
      if (!infoRes.ok) throw new Error(infoJson?.error || 'Failed to load gateway status')
      setInfo(infoJson)
      setLogs(Array.isArray(logsJson?.data) ? logsJson.data : [])
    } catch (e) {
      console.error(e)
      toast.error(e?.message || 'Could not load gateway status')
      setInfo(null)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runHealthCheck = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/sms/gateway/health-check', {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Health check failed')
      if (json.healthy) toast.success('Gateway is healthy')
      else toast.error(json.reason || 'Gateway appears offline')
      await load()
    } catch (e) {
      toast.error(e?.message || 'Health check failed')
    } finally {
      setChecking(false)
    }
  }

  const badge = statusBadge(info?.status)
  const BadgeIcon = badge.Icon

  return (
    <Card className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-royalPurple-text1 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Platform SMS Gateway
          </h2>
          <p className="text-sm text-royalPurple-text3 mt-1">
            Shared Android SIM bridge used by all schools. Pairing is managed by platform admins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            type="button"
            className="btn-secondary btn-sm"
            onClick={runHealthCheck}
            disabled={checking || loading || info?.status === 'not_configured'}
          >
            {checking ? 'Checking…' : 'Health check'}
          </Button>
        </div>
      </div>

      {loading && !info ? (
        <p className="text-sm text-royalPurple-text3">Loading gateway status…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${badge.className}`}
            >
              <BadgeIcon className="w-4 h-4" />
              {badge.label}
            </span>
            {info?.customGatewayEnabled ? (
              <span className="text-xs text-emerald-800 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-300">
                Custom gateway routing on
              </span>
            ) : (
              <span className="text-xs text-royalPurple-text3 bg-royalPurple-page px-2 py-1 rounded border border-royalPurple-border">
                Routing via Africala path (custom flag off)
              </span>
            )}
            {info?.gateway?.isShared ? (
              <span className="text-xs text-royalPurple-text2 bg-royalPurple-page px-2 py-1 rounded border border-royalPurple-border">
                Shared platform gateway
              </span>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-royalPurple-text3">Device</dt>
              <dd className="font-medium text-royalPurple-text1 mt-0.5">
                {info?.gateway?.deviceName || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-royalPurple-text3">Gateway ID</dt>
              <dd className="font-medium text-royalPurple-text1 mt-0.5 font-mono">
                {info?.gateway?.idShort || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-royalPurple-text3">Last seen</dt>
              <dd className="font-medium text-royalPurple-text1 mt-0.5">
                {formatSeen(info?.gateway?.lastSeenAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-royalPurple-text3">
                Today (all SMS)
              </dt>
              <dd className="font-medium text-royalPurple-text1 mt-0.5">
                {info?.sentToday ?? 0} sent · {info?.failedToday ?? 0} failed
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-royalPurple-text3">Total sent</dt>
              <dd className="font-medium text-royalPurple-text1 mt-0.5">{info?.totalSent ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-royalPurple-text3">
                Total failed
              </dt>
              <dd className="font-medium text-royalPurple-text1 mt-0.5">
                {info?.totalFailed ?? 0}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-sm font-semibold text-royalPurple-text1 mb-2">
              Recent SMS (last 20)
            </h3>
            <div className="overflow-x-auto border border-royalPurple-border rounded-md">
              <table className="min-w-full divide-y divide-royalPurple-border text-sm">
                <thead className="bg-royalPurple-page">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      Recipient
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      Channel
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-royalPurple-text3 uppercase">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-royalPurple-border">
                  {logs.map((log, idx) => (
                    <tr key={String(log.id || `${log.createdAt}-${idx}`)}>
                      <td className="px-3 py-2 whitespace-nowrap">{log.status || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {Array.isArray(log.to) ? log.to.join(', ') : log.to || log.recipient || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {log.channel || log.provider || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {!logs.length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-royalPurple-text3">
                        No recent SMS logs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
