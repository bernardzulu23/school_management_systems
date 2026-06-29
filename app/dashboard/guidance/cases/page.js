'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { CASE_CATEGORIES, CONFIDENTIALITY_TIERS } from '@/lib/guidance/constants'

const STATUS_LABELS = { OPEN: 'Open', CLOSED: 'Closed', REFERRED: 'Referred' }

export default function GuidanceCasesPage() {
  const searchParams = useSearchParams()
  const prefillPupilId = searchParams.get('pupilId') || ''

  const [cases, setCases] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(Boolean(prefillPupilId))
  const [form, setForm] = useState({
    pupilId: prefillPupilId,
    category: 'ACADEMIC',
    confidentiality: 'STANDARD',
    summary: '',
  })

  const load = async () => {
    try {
      setLoading(true)
      const [caseRes, pupilRes] = await Promise.all([
        fetch('/api/guidance/cases', { credentials: 'include' }),
        fetch('/api/guidance/pupils', { credentials: 'include' }),
      ])
      const caseJson = await caseRes.json().catch(() => ({}))
      const pupilJson = await pupilRes.json().catch(() => ({}))
      if (!caseRes.ok) throw new Error(caseJson.error || 'Failed to load cases')
      if (!pupilRes.ok) throw new Error(pupilJson.error || 'Failed to load pupils')
      setCases(caseJson.data || [])
      setPupils(pupilJson.data || [])
    } catch (error) {
      toast.error(error.message || 'Could not load cases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createCase = async () => {
    if (!form.pupilId) {
      toast.error('Select a pupil')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/guidance/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not create case')
      toast.success('Case opened')
      setShowForm(false)
      setForm({ pupilId: '', category: 'ACADEMIC', confidentiality: 'STANDARD', summary: '' })
      await load()
    } catch (error) {
      toast.error(error.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Case log">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">Case log</h1>
            <p className="text-royalPurple-text2 text-sm mt-1">
              Confidential counselling and welfare records. Safeguarding cases auto-escalate to the
              headteacher.
            </p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>New case</Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Open new case</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm block sm:col-span-2">
                <span className="text-royalPurple-text2">Pupil</span>
                <select
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2"
                  value={form.pupilId}
                  onChange={(e) => setForm((f) => ({ ...f, pupilId: e.target.value }))}
                >
                  <option value="">Select pupil…</option>
                  {pupils.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.class}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm block">
                <span className="text-royalPurple-text2">Category</span>
                <select
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CASE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm block">
                <span className="text-royalPurple-text2">Confidentiality</span>
                <select
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2"
                  value={form.confidentiality}
                  onChange={(e) => setForm((f) => ({ ...f, confidentiality: e.target.value }))}
                >
                  {CONFIDENTIALITY_TIERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm block sm:col-span-2">
                <span className="text-royalPurple-text2">Summary</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 min-h-[80px]"
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                />
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <Button onClick={createCase} disabled={saving}>
                  {saving ? 'Saving…' : 'Open case'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your cases</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : cases.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No cases yet.</p>
            ) : (
              <ul className="divide-y divide-royalPurple-border">
                {cases.map((c) => (
                  <li key={c.id} className="py-3 flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium text-royalPurple-text1">
                        {c.pupil?.name} · {c.pupil?.class}
                      </p>
                      <p className="text-sm text-royalPurple-text2">
                        {c.category.replace(/_/g, ' ')} · {c.confidentiality} ·{' '}
                        {STATUS_LABELS[c.status] || c.status} · {c._count?.logs || 0} log entries
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/guidance/cases/${c.id}`}
                      className="text-sm text-royalPurple-accentTx hover:underline self-center"
                    >
                      View
                    </Link>
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
