'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

const STATUS_CLASS = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  unpaid: 'bg-royalPurple-card2 text-royalPurple-text2',
}

export default function FeeInvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
      const res = await sessionFetch(`/api/fees/invoices${qs}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load invoices')
      setInvoices(json.invoices || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const recordPayment = async (e) => {
    e.preventDefault()
    if (!payModal) return
    try {
      const res = await sessionFetch('/api/fees/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payModal.id,
          amount: Number(payForm.amount),
          method: payForm.method,
          reference: payForm.reference || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Payment failed')
      toast.success('Payment recorded')
      setPayModal(null)
      setPayForm({ amount: '', method: 'cash', reference: '' })
      load()
    } catch (e) {
      toast.error(e?.message || 'Payment failed')
    }
  }

  return (
    <DashboardLayout title="Invoices">
      <FeatureGate featureId="fee-management">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
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
            <select
              className="ml-auto p-2 border border-royalPurple-border rounded-md bg-royalPurple-card text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Student invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Student</th>
                      <th className="py-2">Schedule</th>
                      <th className="py-2">Net</th>
                      <th className="py-2">Paid</th>
                      <th className="py-2">Balance</th>
                      <th className="py-2">Status</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-royalPurple-border/30">
                        <td className="py-2">
                          {inv.student?.name}
                          <div className="text-xs text-royalPurple-text3">{inv.student?.class}</div>
                        </td>
                        <td className="py-2">{inv.schedule?.name}</td>
                        <td className="py-2">K {Number(inv.netAmount).toFixed(2)}</td>
                        <td className="py-2">K {Number(inv.amountPaid).toFixed(2)}</td>
                        <td className="py-2">K {Number(inv.balance).toFixed(2)}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs capitalize ${STATUS_CLASS[inv.status] || STATUS_CLASS.unpaid}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2">
                          {inv.balance > 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPayModal(inv)
                                setPayForm({
                                  amount: String(inv.balance),
                                  method: 'cash',
                                  reference: '',
                                })
                              }}
                            >
                              Record payment
                            </Button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                    {!invoices.length ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-royalPurple-text3">
                          No invoices found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {payModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Record payment — {payModal.student?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={recordPayment} className="space-y-3">
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />
                    <select
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={payForm.method}
                      onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    >
                      <option value="cash">Cash</option>
                      <option value="mtn_mobile_money">MTN Mobile Money</option>
                      <option value="airtel_money">Airtel Money</option>
                      <option value="zamtel">Zamtel</option>
                      <option value="bank">Bank transfer</option>
                    </select>
                    <input
                      placeholder="Reference (optional)"
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={payForm.reference}
                      onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setPayModal(null)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save payment</Button>
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
