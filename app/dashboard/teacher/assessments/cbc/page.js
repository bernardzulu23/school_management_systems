'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Download, ClipboardList } from 'lucide-react'
import { StaffRouteGuard } from '@/components/auth/StaffRouteGuard'
import { PrimaryOnlyRouteGuard } from '@/components/auth/PrimaryOnlyRouteGuard'
import { SyncStatusBadge } from '@/components/attendance/SyncStatusBadge'
import {
  cacheTeacherJson,
  getCachedTeacherJson,
  queueCbcRating,
  tryOnlineOrQueue,
} from '@/lib/offline/teacher-ops'
import { isBrowserOnline } from '@/lib/offline/network'
import { toast } from 'react-hot-toast'

const RATING_LEVELS = [
  { value: 'EXCELLENT', label: 'Excellent (4)' },
  { value: 'GOOD', label: 'Good (3)' },
  { value: 'FAIR', label: 'Fair (2)' },
  { value: 'NEEDS_IMPROVEMENT', label: 'Needs improvement (1)' },
]

export default function CbcAssessmentPage() {
  const [competencies, setCompetencies] = useState([])
  const [students, setStudents] = useState([])
  const [ratings, setRatings] = useState([])
  const [studentId, setStudentId] = useState('')
  const [competencyId, setCompetencyId] = useState('')
  const [gradeLevel, setGradeLevel] = useState('Grade 4')
  const [term, setTerm] = useState('1')
  const [level, setLevel] = useState('GOOD')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const year = new Date().getFullYear()
    const cacheKey = `cbc:bundle:${year}:${term}:${gradeLevel}`
    try {
      const [refRes, classRes, ratingsRes] = await Promise.all([
        fetch('/api/ecz/reference', { credentials: 'include' }),
        fetch('/api/classes', { credentials: 'include' }),
        fetch(
          `/api/cbc/ratings?academicYear=${year}&term=${term}&gradeLevel=${encodeURIComponent(gradeLevel)}`,
          { credentials: 'include' }
        ),
      ])
      const refJson = await refRes.json()
      const classJson = await classRes.json()
      const ratingsJson = await ratingsRes.json()
      const comps = Array.isArray(refJson?.competencies) ? refJson.competencies : []
      setCompetencies(comps)
      if (comps[0]?.id) setCompetencyId((p) => p || comps[0].id)

      const classes = Array.isArray(classJson?.data) ? classJson.data : classJson?.classes || []
      const learnerList = classes.flatMap((c) =>
        (c.students || []).map((s) => ({
          id: s.id,
          name: s.name,
          grade: c.name || s.grade,
        }))
      )
      setStudents(learnerList)
      if (learnerList[0]?.id) setStudentId((p) => p || learnerList[0].id)

      const ratingRows = Array.isArray(ratingsJson?.data) ? ratingsJson.data : []
      setRatings(ratingRows)
      await cacheTeacherJson(cacheKey, {
        competencies: comps,
        students: learnerList,
        ratings: ratingRows,
      })
    } catch {
      const cached = await getCachedTeacherJson(cacheKey)
      if (cached?.competencies?.length || cached?.students?.length) {
        setCompetencies(cached.competencies || [])
        setStudents(cached.students || [])
        setRatings(cached.ratings || [])
        if (cached.competencies?.[0]?.id) setCompetencyId((p) => p || cached.competencies[0].id)
        if (cached.students?.[0]?.id) setStudentId((p) => p || cached.students[0].id)
        toast('Using cached CBC data (offline)', { icon: '📡' })
      } else {
        toast.error('Failed to load CBC data')
      }
    } finally {
      setLoading(false)
    }
  }, [term, gradeLevel])

  useEffect(() => {
    load()
  }, [load])

  const saveRating = async () => {
    if (!studentId || !competencyId) {
      toast.error('Select learner and competency')
      return
    }
    const body = {
      studentId,
      competencyId,
      gradeLevel,
      term: Number(term),
      academicYear: new Date().getFullYear(),
      level,
      evidenceNote: evidenceNote || undefined,
    }

    const result = await tryOnlineOrQueue(
      async () => {
        const res = await fetch('/api/cbc/ratings', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Save failed')
        return json
      },
      () => queueCbcRating(body)
    )

    if (!result.ok) {
      toast.error(result.error?.message || 'Could not save rating')
      return
    }
    if (result.offline) {
      toast.success('Rating saved offline — will sync when online')
      setEvidenceNote('')
      setRatings((prev) => [
        {
          id: `local-${Date.now()}`,
          ...body,
          student: students.find((s) => s.id === studentId),
          pendingSync: true,
        },
        ...prev.filter(
          (r) =>
            !(
              r.studentId === studentId &&
              r.competencyId === competencyId &&
              Number(r.term) === Number(term)
            )
        ),
      ])
      return
    }
    toast.success('Rating saved')
    setEvidenceNote('')
    load()
  }

  const exportCsv = async () => {
    if (!isBrowserOnline()) {
      toast.error('CSV export needs an internet connection')
      return
    }
    try {
      const res = await fetch(
        `/api/cbc/export?academicYear=${new Date().getFullYear()}&term=${term}&gradeLevel=${encodeURIComponent(gradeLevel)}`,
        { credentials: 'include' }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Export failed')
      const blob = new Blob([json.csvData], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cbc_ratings_${gradeLevel.replace(/\s+/g, '_')}_term${term}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${json.recordCount} ratings`)
    } catch (e) {
      toast.error(e.message || 'Export failed')
    }
  }

  return (
    <StaffRouteGuard>
      <PrimaryOnlyRouteGuard redirectTo="/dashboard/teacher/assessments">
        <DashboardLayout>
          <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/teacher/assessments">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Assessments
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
                <ClipboardList className="h-7 w-7" />
                CBC Continuous Assessment
              </h1>
              <div className="ml-auto">
                <SyncStatusBadge channel="all" noun="change" />
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
              Primary CBC ratings use 4-level descriptors (not ONE–FOUR grades). EPSC external prep
              (Grades 4–7) supports MCQ practice via ECZ Practice. Submit annual ratings by{' '}
              <strong>31 January</strong>.
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Record competency rating</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Grade level</Label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          'ECE',
                          'Reception',
                          'Grade 1',
                          'Grade 2',
                          'Grade 3',
                          'Grade 4',
                          'Grade 5',
                          'Grade 6',
                          'Grade 7',
                        ].map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Term</Label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Term 1</SelectItem>
                        <SelectItem value="2">Term 2</SelectItem>
                        <SelectItem value="3">Term 3</SelectItem>
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
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Competency (ZECF)</Label>
                    <Select value={competencyId} onValueChange={setCompetencyId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {competencies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rating level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RATING_LEVELS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Evidence note (optional)</Label>
                  <textarea
                    className="w-full min-h-[60px] rounded-lg border border-royalPurple-border bg-royalPurple-card2 px-3 py-2 text-sm"
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    placeholder="Observation from class activity, project, etc."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveRating} disabled={loading}>
                    Save rating
                  </Button>
                  <Button variant="outline" onClick={exportCsv}>
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ratings this term ({ratings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : ratings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ratings recorded yet.</p>
                ) : (
                  <ul className="text-sm space-y-2">
                    {ratings.slice(0, 20).map((r) => (
                      <li
                        key={r.id}
                        className="flex justify-between border-b border-royalPurple-border/40 py-2"
                      >
                        <span>
                          {r.student?.name} — {r.competency?.name}
                        </span>
                        <span className="text-muted-foreground">{r.level.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </PrimaryOnlyRouteGuard>
    </StaffRouteGuard>
  )
}
