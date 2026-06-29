'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'

export default function GuidanceReEntryPage() {
  const { user } = useAuth()
  const canAccess = Boolean(user?.guidanceAssignment?.canManageReEntry)

  const [rows, setRows] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    pupilId: '',
    withdrawalDate: '',
    expectedReturnDate: '',
    supportPlan: '',
    consentGuardian: false,
  })

  const load = async () => {
    try {
      setLoading(true)
      const [reRes, pupilRes] = await Promise.all([
        fetch('/api/guidance/reentry', { credentials: 'include' }),
        fetch('/api/guidance/pupils', { credentials: 'include' }),
      ])
      const reJson = await reRes.json().catch(() => ({}))
      const pupilJson = await pupilRes.json().catch(() => ({}))
      if (!reRes.ok) throw new Error(reJson.error || 'Failed to load re-entry records')
      if (!pupilRes.ok) throw new Error(pupilJson.error || 'Failed to load pupils')
      setRows(reJson.data || [])
      setPupils(pupilJson.data || [])
    } catch (error) {
      toast.error(error.message || 'Could not load records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!form.pupilId || !form.withdrawalDate) {
      toast.error('Pupil and withdrawal date are required')
      return
    }
    try {
      const res = await fetch('/api/guidance/reentry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          withdrawalDate: new Date(form.withdrawalDate).toISOString(),
          expectedReturnDate: form.expectedReturnDate
            ? new Date(form.expectedReturnDate).toISOString()
            : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success('Re-entry record created')
      setForm({
        pupilId: '',
        withdrawalDate: '',
        expectedReturnDate: '',
        supportPlan: '',
        consentGuardian: false,
      })
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not save')
    }
  }

  if (!canAccess && !loading) {
    return (
      <DashboardLayout title="Girls re-entry">
        <p className="text-royalPurple-text2 text-sm">
          Re-entry records require explicit permission from your headteacher. Contact them to enable
          this on your guidance assignment.
        </p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Girls re-entry">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Girls re-entry records</h1>
          <p className="text-royalPurple-text2 text-sm mt-1">
            Legally sensitive data — separate permission required. Linked to safeguarding cases when
            applicable.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New record</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="text-royalPurple-text2">Pupil</span>
              <select
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2"
                value={form.pupilId}
                onChange={(e) => setForm((f) => ({ ...f, pupilId: e.target.value }))}
              >
                <option value="">Select…</option>
                {pupils.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.class}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-royalPurple-text2">Withdrawal date</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2"
                value={form.withdrawalDate}
                onChange={(e) => setForm((f) => ({ ...f, withdrawalDate: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-royalPurple-text2">Expected return</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2"
                value={form.expectedReturnDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedReturnDate: e.target.value }))}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-royalPurple-text2">Support plan</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 min-h-[72px]"
                value={form.supportPlan}
                onChange={(e) => setForm((f) => ({ ...f, supportPlan: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-royalPurple-text2 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.consentGuardian}
                onChange={(e) => setForm((f) => ({ ...f, consentGuardian: e.target.checked }))}
              />
              Guardian consent on file
            </label>
            <Button onClick={save} className="sm:col-span-2 w-fit">
              Save record
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : rows.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No re-entry records yet.</p>
            ) : (
              <ul className="divide-y divide-royalPurple-border text-sm">
                {rows.map((r) => (
                  <li key={r.id} className="py-3">
                    <p className="font-medium text-royalPurple-text1">
                      {r.pupil?.name} · {r.pupil?.class}
                    </p>
                    <p className="text-royalPurple-text2">
                      Withdrew {new Date(r.withdrawalDate).toLocaleDateString()}
                      {r.expectedReturnDate
                        ? ` · Expected return ${new Date(r.expectedReturnDate).toLocaleDateString()}`
                        : ''}
                      {r.actualReturnDate
                        ? ` · Returned ${new Date(r.actualReturnDate).toLocaleDateString()}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
