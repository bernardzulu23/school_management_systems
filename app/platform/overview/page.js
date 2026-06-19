'use client'

import { useCallback, useEffect, useState } from 'react'
import { PlatformShell } from '@/components/platform/PlatformShell'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'
import { sessionFetch } from '@/lib/auth/sessionFetch'

function KpiCard({ label, value, sub }) {
  return (
    <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-ink mt-1">{value}</p>
      {sub ? <p className="text-xs text-muted mt-1">{sub}</p> : null}
    </div>
  )
}

export default function PlatformOverviewPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/platform/stats/overview', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json.data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PlatformShell title="Overview">
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : data ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard label="Total schools" value={data.total} />
            <KpiCard label="Active paid" value={data.active} />
            <KpiCard label="On trial" value={data.trial} />
            <KpiCard label="Expired" value={data.expired} />
            <KpiCard
              label="Suspended"
              value={data.suspended}
              sub={`${data.churnSuspendedLast30Days} last 30d`}
            />
          </div>
          <KpiCard
            label="Expiring within 14 days"
            value={data.expiringWithin14Days}
            sub="Subscriptions ending soon"
          />

          <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0_#111111]">
            <h2 className="font-semibold text-ink mb-4">Onboarding per month</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.onboardingByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF3B00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}
    </PlatformShell>
  )
}
