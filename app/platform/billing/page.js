'use client'

import { useCallback, useEffect, useState } from 'react'
import { PlatformShell } from '@/components/platform/PlatformShell'
import toast from 'react-hot-toast'
import { sessionFetch } from '@/lib/auth/sessionFetch'

export default function PlatformBillingPage() {
  const [summary, setSummary] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, payRes] = await Promise.all([
        sessionFetch('/api/platform/billing/summary', { cache: 'no-store' }),
        sessionFetch('/api/platform/billing/payments?limit=15', { cache: 'no-store' }),
      ])
      const sumJson = await sumRes.json()
      const payJson = await payRes.json()
      if (!sumRes.ok) throw new Error(sumJson.error || 'Failed to load billing')
      if (!payRes.ok) throw new Error(payJson.error || 'Failed to load payments')
      setSummary(sumJson.data)
      setPayments(payJson.payments || [])
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
    <PlatformShell title="Billing">
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="space-y-8">
          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
                <p className="text-xs text-muted">MRR estimate (30d paid)</p>
                <p className="text-2xl font-bold">
                  {summary.currency} {summary.mrrEstimateZmw?.toLocaleString()}
                </p>
              </div>
              <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
                <p className="text-xs text-muted">Paid transactions (30d)</p>
                <p className="text-2xl font-bold">{summary.paidTransactionsLast30Days}</p>
              </div>
              <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
                <p className="text-xs text-muted">Trial → paid rate</p>
                <p className="text-2xl font-bold">{summary.trialToPaidConversionPercent}%</p>
              </div>
              <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0_#111111]">
                <p className="text-xs text-muted">Expiring ≤14 days</p>
                <p className="text-2xl font-bold">{summary.expiringWithin14Days}</p>
              </div>
            </div>
          ) : null}

          {summary?.planDistribution ? (
            <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0_#111111]">
              <h2 className="font-semibold mb-4">Plan distribution</h2>
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(summary.planDistribution).map(([plan, count]) => (
                  <li key={plan} className="border border-ink/20 rounded p-3 capitalize">
                    <span className="text-muted text-xs">{plan}</span>
                    <p className="text-xl font-bold">{count}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-2 border-ink bg-white shadow-[4px_4px_0_#111111] overflow-x-auto">
            <h2 className="font-semibold p-4 border-b border-ink/10">Recent payments</h2>
            <table className="w-full text-sm">
              <thead className="bg-ink text-paper text-left">
                <tr>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-ink/10">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.schoolName}</div>
                      <div className="text-xs text-muted">{p.subdomain}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.plan}</td>
                    <td className="px-4 py-3">ZMW {p.amount}</td>
                    <td className="px-4 py-3">{p.status}</td>
                    <td className="px-4 py-3 text-muted">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PlatformShell>
  )
}
