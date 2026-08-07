'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { ArrowLeft, ClipboardList, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { LOCK_ROLE_REQUIREMENT, SBA_ENTRY_START_YEAR } from '@/lib/sba/constants'

const TERMS = ['Term 1', 'Term 2', 'Term 3']

function statusChipClass(status) {
  if (status === 'LOCKED') return 'bg-slate-800 text-white'
  if (status === 'SUBMITTED') return 'bg-emerald-100 text-emerald-900'
  return 'bg-amber-100 text-amber-900'
}

export default function TeacherSbaPage() {
  const { user } = useAuth()
  const canLock = LOCK_ROLE_REQUIREMENT.some(
    (r) => String(r).toLowerCase() === String(user?.role || '').toLowerCase()
  )

  const defaultYear = Math.max(new Date().getFullYear(), SBA_ENTRY_START_YEAR)
  const [academicYear, setAcademicYear] = useState(String(defaultYear))
  const [term, setTerm] = useState('Term 1')
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [subjects, setSubjects] = useState([])
  const [subjectsMeta, setSubjectsMeta] = useState(null)
  const [subjectId, setSubjectId] = useState('')
  const [rosterData, setRosterData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [savingKey, setSavingKey] = useState('')
  const [lockReason, setLockReason] = useState('')

  const yearNum = Number(academicYear)

  const loadClasses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/teacher/sba/classes', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load classes')
      setClasses(data.classes || [])
      if (!classId && data.classes?.length) setClassId(data.classes[0].id)
    } catch (err) {
      toast.error(err.message || 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    if (!classId) return
    let cancelled = false
    ;(async () => {
      setLoadingSubjects(true)
      setSubjectId('')
      setRosterData(null)
      try {
        const params = new URLSearchParams({ academicYear, term })
        const res = await fetch(
          `/api/dashboard/teacher/sba/classes/${classId}/subjects?${params}`,
          { credentials: 'include' }
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to load subjects')
        if (cancelled) return
        setSubjects(data.subjects || [])
        setSubjectsMeta(data)
        if (data.subjects?.length) setSubjectId(data.subjects[0].subjectId)
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Failed to load subjects')
      } finally {
        if (!cancelled) setLoadingSubjects(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [classId, academicYear, term])

  useEffect(() => {
    if (!classId || !subjectId || yearNum < SBA_ENTRY_START_YEAR) {
      setRosterData(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingRoster(true)
      try {
        const params = new URLSearchParams({ academicYear, term })
        const res = await fetch(
          `/api/dashboard/teacher/sba/classes/${classId}/subjects/${subjectId}/roster?${params}`,
          { credentials: 'include' }
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to load roster')
        if (!cancelled) setRosterData(data)
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Failed to load roster')
      } finally {
        if (!cancelled) setLoadingRoster(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [classId, subjectId, academicYear, term, yearNum])

  const components = useMemo(
    () =>
      rosterData?.policy?.components ||
      subjects.find((s) => s.subjectId === subjectId)?.components ||
      [],
    [rosterData, subjects, subjectId]
  )

  const recordFor = (pupilId, componentType) =>
    (rosterData?.roster || [])
      .find((r) => r.pupilId === pupilId)
      ?.records?.find((rec) => rec.componentType === componentType)

  async function saveMark({ pupilId, componentType, rawMark, maxRawMark, existing }) {
    const key = `${pupilId}:${componentType}`
    setSavingKey(key)
    try {
      if (existing?.id) {
        const body = { rawMark: rawMark === '' ? null : Number(rawMark) }
        if (existing.status === 'LOCKED') {
          if (!lockReason.trim()) {
            toast.error('Enter a reason to edit a locked mark')
            return
          }
          body.reason = lockReason.trim()
        }
        const res = await fetch(`/api/dashboard/teacher/sba/records/${existing.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Save failed')
      } else {
        const res = await fetch('/api/dashboard/teacher/sba/records', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pupilId,
            classId,
            subjectId,
            componentType,
            term,
            academicYear: yearNum,
            rawMark: rawMark === '' ? null : Number(rawMark),
            maxRawMark: maxRawMark ?? null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Save failed')
      }
      toast.success('Saved')
      // refresh roster
      const params = new URLSearchParams({ academicYear, term })
      const res = await fetch(
        `/api/dashboard/teacher/sba/classes/${classId}/subjects/${subjectId}/roster?${params}`,
        { credentials: 'include' }
      )
      const data = await res.json().catch(() => ({}))
      if (res.ok) setRosterData(data)
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSavingKey('')
    }
  }

  async function setStatus(recordId, status) {
    setSavingKey(`status:${recordId}`)
    try {
      const res = await fetch(`/api/dashboard/teacher/sba/records/${recordId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Status update failed')
      toast.success(`Marked ${status}`)
      const params = new URLSearchParams({ academicYear, term })
      const r = await fetch(
        `/api/dashboard/teacher/sba/classes/${classId}/subjects/${subjectId}/roster?${params}`,
        { credentials: 'include' }
      )
      const refreshed = await r.json().catch(() => ({}))
      if (r.ok) setRosterData(refreshed)
    } catch (err) {
      toast.error(err.message || 'Status update failed')
    } finally {
      setSavingKey('')
    }
  }

  const emptyMessage =
    yearNum < SBA_ENTRY_START_YEAR
      ? `SBA entry starts in academic year ${SBA_ENTRY_START_YEAR}`
      : subjectsMeta?.message ||
        (subjectsMeta?.emptyReason === 'STARTS_AT_LEVEL'
          ? `SBA recording begins at ${subjectsMeta.startsAtLevelHint}`
          : subjectsMeta?.emptyReason === 'NO_POLICIES'
            ? 'No secondary SBA policies configured yet. Ask headteacher to set policies.'
            : null)

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/teacher">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Secondary SBA
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Class &amp; term</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Academic year</Label>
              <Input
                type="number"
                min={SBA_ENTRY_START_YEAR}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>
            <div>
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? 'Loading…' : 'Select class'} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.year_group})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Select
                value={subjectId}
                onValueChange={setSubjectId}
                disabled={loadingSubjects || !subjects.length}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingSubjects ? 'Loading…' : subjects.length ? 'Select subject' : 'None'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.subjectId} value={s.subjectId}>
                      {s.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {canLock && (
          <Card>
            <CardContent className="pt-4">
              <Label>Reason for locked-mark edits (required when editing LOCKED)</Label>
              <Input
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="e.g. Moderation correction"
              />
            </CardContent>
          </Card>
        )}

        {(emptyMessage || yearNum < SBA_ENTRY_START_YEAR) && !subjects.length && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {emptyMessage || `SBA entry starts in academic year ${SBA_ENTRY_START_YEAR}`}
            </CardContent>
          </Card>
        )}

        {loadingRoster && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loadingRoster && rosterData?.roster && components.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Mark grid — {rosterData.policy?.subjectName || 'Subject'}
                {rosterData.policy?.syllabusVersion
                  ? ` (${rosterData.policy.syllabusVersion})`
                  : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">Learner</th>
                    {components.map((c) => (
                      <th key={c.componentType} className="py-2 px-2">
                        {c.label || c.componentType}
                        {c.maxRawMark != null ? ` /${c.maxRawMark}` : ''}
                      </th>
                    ))}
                    <th className="py-2 pl-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterData.roster.map((row) => (
                    <tr key={row.pupilId} className="border-b border-border/40">
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium">{row.name}</div>
                        {row.examNumber && (
                          <div className="text-xs text-muted-foreground">{row.examNumber}</div>
                        )}
                      </td>
                      {components.map((c) => {
                        const rec = recordFor(row.pupilId, c.componentType)
                        const key = `${row.pupilId}:${c.componentType}`
                        return (
                          <td key={c.componentType} className="py-2 px-2 align-top">
                            <div className="flex flex-col gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={c.maxRawMark ?? undefined}
                                defaultValue={rec?.rawMark ?? ''}
                                disabled={rec?.status === 'LOCKED' && !canLock}
                                className="h-8 w-20"
                                onBlur={(e) => {
                                  const val = e.target.value
                                  const prev = rec?.rawMark == null ? '' : String(rec.rawMark)
                                  if (val === prev) return
                                  saveMark({
                                    pupilId: row.pupilId,
                                    componentType: c.componentType,
                                    rawMark: val,
                                    maxRawMark: c.maxRawMark,
                                    existing: rec,
                                  })
                                }}
                              />
                              {rec && (
                                <span
                                  className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${statusChipClass(rec.status)}`}
                                >
                                  {rec.status}
                                  {savingKey === key ? '…' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="py-2 pl-2 align-top">
                        <div className="flex flex-col gap-1">
                          {(row.records || []).map((rec) => (
                            <div key={rec.id} className="flex flex-wrap gap-1">
                              {rec.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={savingKey === `status:${rec.id}`}
                                  onClick={() => setStatus(rec.id, 'SUBMITTED')}
                                >
                                  Submit {rec.componentType}
                                </Button>
                              )}
                              {rec.status === 'SUBMITTED' && canLock && (
                                <Button
                                  size="sm"
                                  disabled={savingKey === `status:${rec.id}`}
                                  onClick={() => setStatus(rec.id, 'LOCKED')}
                                >
                                  Lock
                                </Button>
                              )}
                              {rec.status === 'LOCKED' && canLock && rec.edits?.length > 0 && (
                                <details className="text-xs text-muted-foreground">
                                  <summary>Audit</summary>
                                  <ul className="mt-1 space-y-1">
                                    {rec.edits.map((e) => (
                                      <li key={e.id}>
                                        {e.previousMark} → {e.newMark} — {e.reason} (
                                        {e.editedBy?.name})
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rosterData.roster.length && (
                <p className="text-sm text-muted-foreground py-4">
                  No pupils enrolled for this class/subject.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {!loadingRoster &&
          subjects.length > 0 &&
          subjectId &&
          components.length === 0 &&
          yearNum >= SBA_ENTRY_START_YEAR && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Policy has no components yet. Configure components under SBA Policy (headteacher).
              </CardContent>
            </Card>
          )}
      </div>
    </DashboardLayout>
  )
}
