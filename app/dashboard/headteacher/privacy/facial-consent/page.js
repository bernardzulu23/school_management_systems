'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, Shield, Ban, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Headteacher/admin: school opt-in + ConsentRecord ledger for facial attendance (ZDPA).
 */
export default function FacialConsentPage() {
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState(null)
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    guardianId: '',
    method: 'PAPER_FORM',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const selectedGuardians = selected?.guardians || []
  const selectedGuardian = selectedGuardians.find((g) => g.id === form.guardianId) || null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (classId) params.set('classId', classId)
      if (q.trim()) params.set('q', q.trim())
      const res = await sessionFetch(`/api/privacy/facial-consent?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setSchool(json.school)
      setStudents(json.students || [])
      setClasses(json.classes || [])
    } catch (e) {
      toast.error(e?.message || 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [classId, q])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const active = students.filter((s) => s.hasActiveConsent).length
    const templates = students.filter((s) => s.hasFaceTemplate).length
    return { active, templates, total: students.length }
  }, [students])

  async function patchSettings(patch) {
    setSaving(true)
    try {
      const res = await sessionFetch('/api/privacy/facial-attendance-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Update failed')
      setSchool((s) => ({ ...s, ...json.school }))
      toast.success('Facial attendance settings saved')
      await load()
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function submitDecision(decision) {
    if (!selected) return
    if (!selectedGuardians.length) {
      toast.error('No parent/guardian linked to this student — link one in student records first')
      return
    }
    if (!form.guardianId || !selectedGuardian) {
      toast.error('Select the parent/guardian who signed')
      return
    }
    setSaving(true)
    try {
      const res = await sessionFetch('/api/privacy/facial-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pupilId: selected.studentId,
          decision,
          guardianId: form.guardianId,
          method: form.method,
          notes: form.notes,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success(decision === 'deny' ? 'Refusal recorded' : 'Consent recorded')
      setSelected(null)
      setForm({ guardianId: '', method: 'PAPER_FORM', notes: '' })
      await load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function withdraw(row) {
    if (!confirm(`Withdraw facial consent for ${row.name}? Their face template will be deleted.`)) {
      return
    }
    setSaving(true)
    try {
      const res = await sessionFetch(`/api/privacy/facial-consent/${row.studentId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Withdrawn via admin console',
          withdrawnByName: 'Parent/guardian',
          withdrawnByRelationship: 'guardian',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Withdraw failed')
      toast.success('Consent withdrawn; template cleared')
      await load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Facial consent">
      <div className="space-y-4">
        <Link href="/dashboard/headteacher">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Facial recognition attendance (ZDPA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-royalPurple-text2">
            <p>
              Biometric data of minors requires documented parental/guardian consent — not implied
              by school enrolment. Templates are derived embeddings only (never raw photos). Manual
              Present/Late remains the default path for any pupil without consent.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(school?.facialAttendanceEnabled)}
                disabled={saving || loading}
                onChange={(e) => patchSettings({ facialAttendanceEnabled: e.target.checked })}
              />
              <span className="font-semibold text-royalPurple-text1">
                Enable facial recognition attendance for this school
              </span>
            </label>
            <label className="block max-w-xs">
              <span className="text-xs uppercase font-semibold">Embedding retention (days)</span>
              <input
                type="number"
                min={0}
                max={3650}
                className="zsms-input w-full mt-1"
                defaultValue={school?.faceEmbeddingRetentionDays ?? 365}
                key={school?.faceEmbeddingRetentionDays}
                onBlur={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v) && v !== school?.faceEmbeddingRetentionDays) {
                    patchSettings({ faceEmbeddingRetentionDays: v })
                  }
                }}
              />
              <span className="text-xs">0 = while enrolled only (still cleared on leave).</span>
            </label>
            <p className="text-xs">
              Active consent: {stats.active} · Templates on file: {stats.templates} · Listed:{' '}
              {stats.total}
            </p>
          </CardContent>
        </Card>

        <FeatureGate
          key={String(school?.facialAttendanceEnabled)}
          featureId="facial-attendance"
          fallback={
            <Card>
              <CardContent className="py-8 text-center text-royalPurple-text2">
                Turn on the school toggle above to manage pupil consent for facial attendance.
              </CardContent>
            </Card>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>Consent register</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <select
                  className="zsms-select"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="zsms-input"
                  placeholder="Search name / exam no."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
                  Refresh
                </Button>
              </div>

              {loading ? (
                <p>Loading…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-royalPurple-border/40">
                        <th className="py-2">Pupil</th>
                        <th>Class</th>
                        <th>Consent</th>
                        <th>Template</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((row) => (
                        <tr key={row.studentId} className="border-b border-royalPurple-border/20">
                          <td className="py-2 font-medium">{row.name}</td>
                          <td>{row.class}</td>
                          <td>
                            {row.hasActiveConsent ? (
                              <span className="text-green-700 inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Granted
                              </span>
                            ) : (
                              <span className="text-royalPurple-text3">None / withdrawn</span>
                            )}
                          </td>
                          <td>{row.hasFaceTemplate ? 'Yes' : '—'}</td>
                          <td className="text-right space-x-2 whitespace-nowrap">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const guardians = row.guardians || []
                                setSelected(row)
                                setForm({
                                  guardianId: guardians.length === 1 ? guardians[0].id : '',
                                  method: 'PAPER_FORM',
                                  notes: '',
                                })
                              }}
                            >
                              Record
                            </Button>
                            {row.hasActiveConsent ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => withdraw(row)}
                              >
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Withdraw
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </FeatureGate>

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle>Record consent — {selected.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-w-lg">
              <p className="text-xs text-royalPurple-text2">
                Paper form digitised: select the linked parent/guardian who signed. Relationship and
                contact come from student records.
              </p>
              {!selectedGuardians.length ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-royalPurple-text1">
                  <p>
                    No parent/guardian linked to this student — link one in student records first.
                  </p>
                  <Link
                    href="/dashboard/headteacher/parent-links"
                    className="text-xs underline mt-2 inline-block"
                  >
                    Open parent links
                  </Link>
                </div>
              ) : (
                <>
                  <label className="block text-xs font-semibold uppercase text-royalPurple-text2">
                    Parent/guardian
                    <select
                      className="zsms-select w-full mt-1"
                      value={form.guardianId}
                      onChange={(e) => setForm((f) => ({ ...f, guardianId: e.target.value }))}
                    >
                      <option value="">Select who signed…</option>
                      {selectedGuardians.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                          {g.relationship ? ` (${g.relationship})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold uppercase text-royalPurple-text2">
                    Relationship
                    <input
                      className="zsms-input w-full mt-1 bg-royalPurple-card2"
                      value={selectedGuardian?.relationship || ''}
                      readOnly
                      placeholder="—"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase text-royalPurple-text2">
                    Contact / email
                    <input
                      className="zsms-input w-full mt-1 bg-royalPurple-card2"
                      value={selectedGuardian?.contact || ''}
                      readOnly
                      placeholder="—"
                    />
                  </label>
                </>
              )}
              <select
                className="zsms-select w-full"
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                disabled={!selectedGuardians.length}
              >
                <option value="PAPER_FORM">Paper form</option>
                <option value="DIGITIZED">Digitized scan of paper</option>
                <option value="IN_APP">In-app</option>
                <option value="VERBAL_WITH_WITNESS">Verbal with witness</option>
                <option value="OTHER">Other</option>
              </select>
              <textarea
                className="zsms-input w-full"
                rows={2}
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                disabled={!selectedGuardians.length}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={saving || !selectedGuardians.length || !form.guardianId}
                  onClick={() => submitDecision('grant')}
                >
                  Grant consent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || !selectedGuardians.length || !form.guardianId}
                  onClick={() => submitDecision('deny')}
                >
                  Record refusal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelected(null)
                    setForm({ guardianId: '', method: 'PAPER_FORM', notes: '' })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
