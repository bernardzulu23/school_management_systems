'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { PrimaryOnlyRouteGuard } from '@/components/auth/PrimaryOnlyRouteGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { listPrimaryResultTypes, RESULT_TYPES } from '@/lib/results/resultTypes'
import { calculateGrade } from '@/lib/gradingSystem'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'

export default function TeacherPrimaryResultsPage() {
  const [assignments, setAssignments] = useState([])
  const [assignmentId, setAssignmentId] = useState('')
  const [term, setTerm] = useState('Term 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [resultType, setResultType] = useState(RESULT_TYPES.WEEK_2)
  const [pupils, setPupils] = useState([])
  const [scores, setScores] = useState({})
  const [resultIds, setResultIds] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const types = listPrimaryResultTypes()

  const selected = useMemo(
    () => assignments.find((a) => a.id === assignmentId) || null,
    [assignments, assignmentId]
  )

  useEffect(() => {
    ;(async () => {
      try {
        const res = await sessionFetch('/api/teaching-assignments')
        const json = await res.json().catch(() => ({}))
        const rows = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.assignments)
            ? json.assignments
            : Array.isArray(json)
              ? json
              : []
        const normalized = rows.map((a, i) => ({
          id: a.id || `${a.classId}-${a.subjectId}-${i}`,
          classId: a.classId,
          subjectId: a.subjectId,
          className: a.className || a.class?.name || a.classLabel,
          subjectName: a.subjectName || a.subject?.name || a.subjectLabel,
        }))
        setAssignments(normalized)
        if (normalized[0]?.id) setAssignmentId(normalized[0].id)
      } catch {
        setAssignments([])
      }
    })()
  }, [])

  const loadResults = useCallback(async () => {
    if (!selected?.classId || !selected?.subjectId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        classId: selected.classId,
        subjectId: selected.subjectId,
        term,
        year: String(year),
        resultType,
      })
      const res = await sessionFetch(`/api/teacher/primary-results?${params.toString()}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load')
      const nextPupils = json.data?.pupils || []
      const nextResults = json.data?.results || []
      setPupils(nextPupils)
      const scoreMap = {}
      const idMap = {}
      for (const r of nextResults) {
        scoreMap[r.studentId] = r.score
        idMap[r.studentId] = r.id
      }
      setScores(scoreMap)
      setResultIds(idMap)
    } catch (e) {
      toast.error(e?.message || 'Failed to load results')
      setPupils([])
    } finally {
      setLoading(false)
    }
  }, [resultType, selected, term, year])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  const save = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const payload = {
        resultType,
        results: pupils
          .map((p) => ({
            studentId: p.id,
            subjectId: selected.subjectId,
            classId: selected.classId,
            term,
            year,
            resultType,
            score: scores[p.id] === '' || scores[p.id] == null ? null : Number(scores[p.id]),
          }))
          .filter((r) => r.score != null && !Number.isNaN(r.score)),
      }
      const res = await sessionFetch('/api/teacher/primary-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'Save failed')
      toast.success(`Saved ${json.applied ?? 0} results`)
      await loadResults()
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteOne = async (studentId) => {
    const id = resultIds[studentId]
    if (!id) {
      setScores((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      return
    }
    if (!window.confirm('Delete this result entry?')) return
    try {
      const res = await sessionFetch(`/api/teacher/primary-results?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'Delete failed')
      toast.success('Result deleted')
      await loadResults()
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  return (
    <DashboardLayout title="Primary results">
      <PrimaryOnlyRouteGuard>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <h1 className="text-2xl font-bold text-royalPurple-text1">Primary result entry</h1>
          <p className="text-sm text-royalPurple-text3">
            Enter week 2, week 7, and end-of-term assessments for your classes.
          </p>

          <div className="flex flex-wrap gap-3">
            <select
              className="zsms-select min-w-[220px]"
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.className || a.class?.name || a.classId} ·{' '}
                  {a.subjectName || a.subject?.name || a.subjectId}
                </option>
              ))}
            </select>
            <select className="zsms-select" value={term} onChange={(e) => setTerm(e.target.value)}>
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
            <input
              className="zsms-input w-28"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
            />
            <select
              className="zsms-select"
              value={resultType}
              onChange={(e) => setResultType(e.target.value)}
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Button onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {loading ? 'Loading…' : `${pupils.length} pupils`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-royalPurple-text3">
                      <th className="py-2 pr-4">Pupil</th>
                      <th className="py-2 pr-4">Score</th>
                      <th className="py-2 pr-4">Grade</th>
                      <th className="py-2"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pupils.map((p) => {
                      const score = scores[p.id]
                      const gradeInfo =
                        score === '' || score == null ? null : calculateGrade(Number(score))
                      return (
                        <tr key={p.id} className="border-t border-royalPurple-border">
                          <td className="py-2 pr-4">{p.name}</td>
                          <td className="py-2 pr-4">
                            <Input
                              className="w-24"
                              type="number"
                              min={0}
                              max={100}
                              value={score ?? ''}
                              onChange={(e) =>
                                setScores((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                            />
                          </td>
                          <td className="py-2 pr-4">{gradeInfo?.grade || '—'}</td>
                          <td className="py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteOne(p.id)}
                              aria-label={`Delete result for ${p.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </PrimaryOnlyRouteGuard>
    </DashboardLayout>
  )
}
