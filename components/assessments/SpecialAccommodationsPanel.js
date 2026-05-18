'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { ACCOMMODATION_TYPES, accommodationTypeLabel } from '@/lib/ecz/ecz-accommodations'
import { CheckCircle, Clock, Trash2, UserPlus } from 'lucide-react'

function formLevelPattern(level) {
  const n = Number(level)
  return new RegExp(`^form\\s*${n}\\b`, 'i')
}

export function SpecialAccommodationsPanel() {
  const { user } = useAuth()
  const role = String(user?.role || '').toLowerCase()
  const canApprove = ['hod', 'headteacher', 'admin'].includes(role)

  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [rows, setRows] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [students, setStudents] = useState([])
  const [formLevel, setFormLevel] = useState('1')
  const [studentId, setStudentId] = useState('')
  const [accommodationType, setAccommodationType] = useState(ACCOMMODATION_TYPES[0].id)
  const [details, setDetails] = useState('')
  const [selectedMeasures, setSelectedMeasures] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const typeDef = ACCOMMODATION_TYPES.find((t) => t.id === accommodationType)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ecz/accommodations?appliedForYear=${year}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data || [])
      setPendingCount(json.pendingCount ?? 0)
    } catch (e) {
      toast.error(e.message || 'Could not load accommodations')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    load()
  }, [load])

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students?limit=500', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      const list = Array.isArray(json.data) ? json.data : []
      const pattern = formLevelPattern(formLevel)
      setStudents(
        list.filter((s) => {
          const cls = String(s.class || s.classRef?.name || '')
          return pattern.test(cls)
        })
      )
    } catch {
      setStudents([])
    }
  }, [formLevel])

  useEffect(() => {
    if (showForm) loadStudents()
  }, [showForm, loadStudents])

  useEffect(() => {
    setSelectedMeasures([])
  }, [accommodationType])

  const toggleMeasure = (m) => {
    setSelectedMeasures((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!studentId) {
      toast.error('Select a learner')
      return
    }
    if (!selectedMeasures.length) {
      toast.error('Select at least one accommodation')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/ecz/accommodations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          accommodationType,
          details,
          accommodations: selectedMeasures,
          appliedForYear: parseInt(year, 10),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success(json.message)
      setShowForm(false)
      setDetails('')
      setStudentId('')
      setSelectedMeasures([])
      load()
    } catch (e) {
      toast.error(e.message || 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  const approve = async (id) => {
    try {
      const res = await fetch(`/api/ecz/accommodations/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success('Approved for ECZ audit')
      load()
    } catch (e) {
      toast.error(e.message || 'Approval failed')
    }
  }

  const remove = async (id) => {
    if (!confirm('Remove this accommodation record?')) return
    try {
      const res = await fetch(`/api/ecz/accommodations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success('Removed')
      load()
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-purple-200/50 bg-purple-500/10 p-4 text-sm text-royalPurple-text2">
        <strong className="text-royalPurple-text1">ECZ Rule 6:</strong> Learners with special needs
        must have officially recorded accommodations (Braille, extra time, scribe, etc.) linked to
        assessments and ECZ submissions. Teachers may submit requests; HOD/headteacher approves.
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-32">
          <Label>Academic year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((o) => {
                const y = String(new Date().getFullYear() - o)
                return (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        {pendingCount > 0 && canApprove ? (
          <span className="inline-flex items-center gap-1 text-amber-300 text-sm font-medium">
            <Clock className="h-4 w-4" />
            {pendingCount} pending approval
          </span>
        ) : null}
        <Button onClick={() => setShowForm((v) => !v)}>
          <UserPlus className="h-4 w-4 mr-1" />
          {showForm ? 'Cancel' : 'Register learner'}
        </Button>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={submit}
          className="rounded-xl border border-royalPurple-border/50 p-4 space-y-4 bg-royalPurple-card/40"
        >
          <h4 className="font-semibold text-royalPurple-text1">New special accommodation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Form</Label>
              <Select
                value={formLevel}
                onValueChange={(v) => {
                  setFormLevel(v)
                  setStudentId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Form 1</SelectItem>
                  <SelectItem value="2">Form 2</SelectItem>
                  <SelectItem value="3">Form 3</SelectItem>
                  <SelectItem value="4">Form 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Learner</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select learner" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.exam_number ? `(${s.exam_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Need category</Label>
              <Select value={accommodationType} onValueChange={setAccommodationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOMMODATION_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Details (for ECZ audit)</Label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-lg border border-royalPurple-border bg-royalPurple-deep/50 px-3 py-2 text-sm text-royalPurple-text1"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Confirmed visual impairment; requires enlarged print for all SBA tasks…"
              required
            />
          </div>
          {typeDef ? (
            <div>
              <Label>Accommodations to apply</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {typeDef.measures.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMeasure(m)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selectedMeasures.includes(m)
                        ? 'bg-accent text-white border-accent'
                        : 'border-royalPurple-border text-royalPurple-text2 hover:bg-royalPurple-muted'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : canApprove ? 'Register & approve' : 'Submit for HOD approval'}
          </Button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading accommodations…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accommodations recorded for {year}. Register learners who need ECZ-approved support.
        </p>
      ) : (
        <ul className="divide-y divide-royalPurple-border/40 rounded-xl border border-royalPurple-border/40 overflow-hidden">
          {rows.map((r) => (
            <li
              key={r.id}
              className="p-4 bg-royalPurple-card/30 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-royalPurple-text1">{r.learnerName}</p>
                  {r.isApproved ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-royalPurple-text3 mt-0.5">
                  {r.className} · {r.learnerNumber} · {accommodationTypeLabel(r.accommodationType)}
                </p>
                <p className="text-sm text-royalPurple-text2 mt-2">{r.details}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(r.accommodations || []).map((a) => (
                    <span
                      key={a}
                      className="text-xs bg-royalPurple-muted px-2 py-0.5 rounded text-royalPurple-text2"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!r.isApproved && canApprove ? (
                  <Button size="sm" onClick={() => approve(r.id)}>
                    Approve
                  </Button>
                ) : null}
                {canApprove ? (
                  <Button size="sm" variant="outline" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
