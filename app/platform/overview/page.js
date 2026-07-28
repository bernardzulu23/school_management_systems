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

function formatCount(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('en-GB')
}

export default function PlatformOverviewPage() {
  const [data, setData] = useState(null)
  const [traffic, setTraffic] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, trafficRes] = await Promise.all([
        sessionFetch('/api/platform/stats/overview', { cache: 'no-store' }),
        sessionFetch('/api/platform/stats/web-analytics', { cache: 'no-store' }),
      ])
      const overviewJson = await overviewRes.json()
      if (!overviewRes.ok) throw new Error(overviewJson.error || 'Failed to load overview')
      setData(overviewJson.data)

      const trafficJson = await trafficRes.json().catch(() => ({}))
      if (trafficRes.ok) {
        setTraffic(trafficJson.data || null)
      } else {
        setTraffic({
          configured: false,
          available: false,
          message: trafficJson.error || 'Could not load website traffic',
          windows: null,
          daily: [],
        })
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const windows = traffic?.windows
  const daily = traffic?.daily || []

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

          <section className="space-y-4">
            <div>
              <h2 className="font-semibold text-ink text-lg">Website traffic</h2>
              <p className="text-xs text-muted mt-1">
                Production visitors from Vercel Web Analytics (counts start after Analytics is
                enabled and deployed).
              </p>
            </div>

            {traffic?.available && windows ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    label="Visitors (7d)"
                    value={formatCount(windows.last7Days?.visitors)}
                    sub={`${formatCount(windows.today?.visitors)} today`}
                  />
                  <KpiCard
                    label="Page views (7d)"
                    value={formatCount(windows.last7Days?.pageviews)}
                    sub={`${formatCount(windows.today?.pageviews)} today`}
                  />
                  <KpiCard
                    label="Visitors (30d)"
                    value={formatCount(windows.last30Days?.visitors)}
                  />
                  <KpiCard
                    label="Page views (30d)"
                    value={formatCount(windows.last30Days?.pageviews)}
                  />
                </div>

                <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0_#111111]">
                  <h3 className="font-semibold text-ink mb-4">Daily visitors (14 days)</h3>
                  {daily.length ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={daily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="visitors" fill="#FF3B00" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      No daily visitor data yet. Open the public site so page views can be recorded.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="border-2 border-dashed border-ink/40 bg-white p-6 text-sm text-muted">
                <p className="font-medium text-ink mb-2">Traffic not available yet</p>
                <p>
                  {traffic?.message ||
                    'Enable Vercel Web Analytics and set VERCEL_API_TOKEN on the project.'}
                </p>
              </div>
            )}
          </section>

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
