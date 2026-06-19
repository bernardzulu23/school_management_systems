'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, CreditCard, Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

const GRANT_TYPES = ['GRZ', 'PEF', 'OTHER']

function formatMoney(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function GrantsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    grantType: 'GRZ',
    amountReceived: '',
    receivedDate: '',
    academicYear: new Date().getFullYear(),
    term: 1,
    pupilCount: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch(`/api/government/grants?year=${year}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load grants')
      setData(json.data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    load()
  }, [load])

  const submitGrant = async (e) => {
    e.preventDefault()
    try {
      const res = await sessionFetch('/api/government/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to create grant')
      toast.success('Grant recorded')
      setShowForm(false)
      setForm({
        grantType: 'GRZ',
        amountReceived: '',
        receivedDate: '',
        academicYear: year,
        term: 1,
        pupilCount: '',
        notes: '',
      })
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed to save')
    }
  }

  const summary = data?.summary || {}
  const grants = data?.grants || []

  return (
    <DashboardLayout title="Grants Tracking">
      <FeatureGate featureId="grants-tracking">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/headteacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <label className="text-sm flex items-center gap-2 ml-auto">
              Year
              <input
                type="number"
                className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card w-24"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add grant
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Received', value: summary.totalReceived },
                  { label: 'Budgeted', value: summary.totalBudgeted },
                  { label: 'Spent', value: summary.totalSpent },
                  { label: 'Balance', value: summary.balance },
                ].map((card) => (
                  <Card key={card.label}>
                    <CardContent className="pt-6">
                      <p className="text-xs text-royalPurple-text2">{card.label}</p>
                      <p className="text-2xl font-bold">K {formatMoney(card.value)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Grant register ({grants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Term</th>
                        <th className="py-2 pr-3">Received</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">Spent</th>
                        <th className="py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grants.map((g) => {
                        const pct =
                          g.totalBudgeted > 0
                            ? Math.min(100, Math.round((g.totalSpent / g.totalBudgeted) * 100))
                            : 0
                        return (
                          <tr key={g.id} className="border-b border-royalPurple-border/30">
                            <td className="py-3 pr-3">{g.grantType}</td>
                            <td className="py-3 pr-3">T{g.term}</td>
                            <td className="py-3 pr-3">
                              {g.receivedDate ? new Date(g.receivedDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 pr-3">K {formatMoney(g.amountReceived)}</td>
                            <td className="py-3 pr-3">
                              <div>K {formatMoney(g.totalSpent)}</div>
                              <div className="h-1.5 bg-royalPurple-card2 rounded mt-1 w-24">
                                <div
                                  className="h-full bg-royalPurple-accent rounded"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3">K {formatMoney(g.balance)}</td>
                          </tr>
                        )
                      })}
                      {!grants.length ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-royalPurple-text3">
                            No grants recorded for {year}.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}

          {showForm ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle>Record grant receipt</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitGrant} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.grantType}
                      onChange={(e) => setForm({ ...form, grantType: e.target.value })}
                    >
                      {GRANT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Amount received (ZMW)"
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.amountReceived}
                      onChange={(e) => setForm({ ...form, amountReceived: e.target.value })}
                    />
                    <input
                      type="date"
                      required
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.receivedDate}
                      onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
                    />
                    <input
                      type="number"
                      required
                      placeholder="Pupil count"
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.pupilCount}
                      onChange={(e) => setForm({ ...form, pupilCount: e.target.value })}
                    />
                    <input
                      type="number"
                      min={1}
                      max={3}
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.term}
                      onChange={(e) => setForm({ ...form, term: Number(e.target.value) })}
                    />
                    <input
                      type="number"
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.academicYear}
                      onChange={(e) => setForm({ ...form, academicYear: Number(e.target.value) })}
                    />
                    <textarea
                      placeholder="Notes (optional)"
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card md:col-span-2"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                    <div className="md:col-span-2 flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save grant</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </FeatureGate>
    </DashboardLayout>
  )
}
