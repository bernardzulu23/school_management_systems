'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, FileText, Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function FeeSchedulesPage() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    amount: '',
    dueDate: '',
    term: 1,
    academicYear: new Date().getFullYear(),
    yearGroup: '',
    feeType: 'tuition',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/fees/schedules')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load schedules')
      setSchedules(json.schedules || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await sessionFetch('/api/fees/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to create schedule')
      toast.success('Fee schedule created')
      setShowForm(false)
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed to save')
    }
  }

  const generate = async (scheduleId) => {
    try {
      const res = await sessionFetch('/api/fees/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Generate failed')
      toast.success(`Created ${json.created} invoices (${json.skipped} skipped)`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Generate failed')
    }
  }

  return (
    <DashboardLayout title="Fee Schedules">
      <FeatureGate featureId="fee-management">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
            <Button size="sm" className="ml-auto" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create schedule
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Active schedules
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Name</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Term</th>
                      <th className="py-2">Due</th>
                      <th className="py-2">Invoices</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} className="border-b border-royalPurple-border/30">
                        <td className="py-2">{s.name}</td>
                        <td className="py-2">K {Number(s.amount).toFixed(2)}</td>
                        <td className="py-2">
                          T{s.term} / {s.academicYear}
                        </td>
                        <td className="py-2">{new Date(s.dueDate).toLocaleDateString()}</td>
                        <td className="py-2">{s._count?.invoices ?? 0}</td>
                        <td className="py-2">
                          <Button size="sm" variant="outline" onClick={() => generate(s.id)}>
                            Generate invoices
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!schedules.length ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-royalPurple-text3">
                          No fee schedules yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {showForm ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle>New fee schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      required
                      placeholder="Name"
                      className="md:col-span-2 p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="Amount (ZMW)"
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                    <input
                      required
                      type="date"
                      className="p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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
                    <input
                      placeholder="Year group (optional)"
                      className="md:col-span-2 p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.yearGroup}
                      onChange={(e) => setForm({ ...form, yearGroup: e.target.value })}
                    />
                    <div className="md:col-span-2 flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save</Button>
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
