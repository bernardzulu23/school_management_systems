'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, Plus, RefreshCw, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual (30 days)' },
  { value: 'sick', label: 'Sick (90 days)' },
  { value: 'study', label: 'Study' },
  { value: 'other', label: 'Other' },
]

export default function StaffLeavePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    teacherId: '',
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/government/leave')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load leave')
      setData(json.data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submitLeave = async (e) => {
    e.preventDefault()
    try {
      const res = await sessionFetch('/api/government/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to submit leave')
      toast.success('Leave request submitted')
      setShowForm(false)
      setForm({ teacherId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' })
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed to submit')
    }
  }

  const updateStatus = async (leaveId, status) => {
    try {
      const res = await sessionFetch(`/api/government/leave/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Action failed')
      toast.success(`Leave ${status}`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Action failed')
    }
  }

  const balances = data?.balances || []
  const leaves = data?.leaves || []

  return (
    <DashboardLayout title="Staff Leave">
      <FeatureGate featureId="teacher-leave">
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
            <Button size="sm" className="ml-auto" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Apply leave
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Leave balances
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Teacher</th>
                        <th className="py-2">Annual used / left</th>
                        <th className="py-2">Sick used / left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.map((b) => (
                        <tr key={b.teacherId} className="border-b border-royalPurple-border/30">
                          <td className="py-2">{b.teacherName || b.email}</td>
                          <td className="py-2">
                            {b.annual.used} / {b.annual.remaining} (cap {b.annual.cap})
                          </td>
                          <td className="py-2">
                            {b.sick.used} / {b.sick.remaining} (cap {b.sick.cap})
                          </td>
                        </tr>
                      ))}
                      {!balances.length ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-royalPurple-text3">
                            No teachers found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Leave register</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Teacher</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Dates</th>
                        <th className="py-2">Days</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((l) => {
                        const teacher = balances.find((b) => b.teacherId === l.teacherId)
                        return (
                          <tr key={l.id} className="border-b border-royalPurple-border/30">
                            <td className="py-2">{teacher?.teacherName || l.teacherId}</td>
                            <td className="py-2 capitalize">{l.leaveType}</td>
                            <td className="py-2">
                              {new Date(l.startDate).toLocaleDateString()} –{' '}
                              {new Date(l.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-2">{l.daysCount}</td>
                            <td className="py-2 capitalize">{l.status}</td>
                            <td className="py-2">
                              {l.status === 'pending' ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(l.id, 'approved')}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(l.id, 'rejected')}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {!leaves.length ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-royalPurple-text3">
                            No leave requests yet.
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
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Apply for leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitLeave} className="space-y-3">
                    <select
                      required
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.teacherId}
                      onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                    >
                      <option value="">Select teacher</option>
                      {balances.map((b) => (
                        <option key={b.teacherId} value={b.teacherId}>
                          {b.teacherName || b.email}
                        </option>
                      ))}
                    </select>
                    <select
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.leaveType}
                      onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                    >
                      {LEAVE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      required
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                    <input
                      type="date"
                      required
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                    <textarea
                      placeholder="Reason (optional)"
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      rows={2}
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Submit</Button>
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
