'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { ArrowLeft, Download, Send, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateECZExport, formatForECZSubmission } from '@/lib/ecz/export-validator'
import { StaffRouteGuard } from '@/components/auth/StaffRouteGuard'

const FORMS = [
  { value: '1', label: 'Form 1' },
  { value: '2', label: 'Form 2' },
  { value: '3', label: 'Form 3' },
]

export default function EczSubmitReviewPage() {
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [formLevel, setFormLevel] = useState('1')
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()))
  const [scores, setScores] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/subjects', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
        setSubjects(list)
        if (list[0]?.id) setSubjectId(String(list[0].id))
      })
      .catch(() => {})
  }, [])

  const loadPreview = useCallback(async () => {
    if (!subjectId) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        subjectId,
        formLevel,
        academicYear,
      })
      const [scoresRes, classRes] = await Promise.all([
        fetch(`/api/ecz/scores?${qs}`, { credentials: 'include' }),
        fetch(`/api/classes?limit=100`, { credentials: 'include' }),
      ])
      const scoresJson = await scoresRes.json().catch(() => ({}))
      const classJson = await classRes.json().catch(() => ({}))
      const rawScores = Array.isArray(scoresJson?.data) ? scoresJson.data : []
      const mapped = rawScores.map((s) => ({
        studentId: s.studentId || s.student?.id,
        studentName: s.student?.name || s.studentName || 'Learner',
        learnerNumber: s.student?.exam_number || s.learnerNumber || '',
        total: s.totalSBAScore ?? s.total ?? 0,
        remarks: s.remarks || '',
      }))
      setScores(mapped)

      const classes = Array.isArray(classJson?.data) ? classJson.data : []
      const enrolled = []
      for (const cls of classes.slice(0, 30)) {
        const r = await fetch(`/api/classes/students?classId=${encodeURIComponent(cls.id)}`, {
          credentials: 'include',
        })
        const j = await r.json().catch(() => ({}))
        const list = Array.isArray(j?.data) ? j.data : []
        for (const st of list) {
          if (String(st.form || cls.year_group || '').includes(formLevel)) {
            enrolled.push({ id: st.id, name: st.name })
          }
        }
      }
      if (enrolled.length === 0) {
        enrolled.push(...mapped.map((m) => ({ id: m.studentId, name: m.studentName })))
      }
      setStudents(enrolled)
    } catch (e) {
      toast.error(e?.message || 'Could not load scores')
    } finally {
      setLoading(false)
    }
  }, [subjectId, formLevel, academicYear])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const subjectName = useMemo(
    () => subjects.find((s) => String(s.id) === subjectId)?.name || '',
    [subjects, subjectId]
  )

  const validation = useMemo(
    () =>
      validateECZExport({
        scores,
        enrolledStudents: students,
        subject: subjectName,
        form: `Form ${formLevel}`,
        academicYear: Number(academicYear),
        submission: { sbaWeight: subjectName.toLowerCase().includes('physical') ? 40 : 30 },
      }),
    [scores, students, subjectName, formLevel, academicYear]
  )

  const formatted = useMemo(() => formatForECZSubmission(scores), [scores])

  const downloadCsv = () => {
    const header = 'SN,Learner Name,Learner Number,SBA Score,Remarks\n'
    const rows = formatted
      .map(
        (r) =>
          `${r.sn},"${r.learnerName.replace(/"/g, '""')}",${r.learnerNumber},${r.sbaScore},"${(r.remarks || '').replace(/"/g, '""')}"`
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ecz_sba_f${formLevel}_${academicYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const submitToEcz = async () => {
    if (!validation.valid) {
      toast.error('Fix validation errors before submitting')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/ecz/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectId,
          formLevel: Number(formLevel),
          academicYear: Number(academicYear),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Submission failed')
      toast.success('Marked as submitted — download CSV for your records')
    } catch (e) {
      toast.error(e?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StaffRouteGuard allowedRoles={['headteacher', 'hod', 'HOD', 'admin', 'administrator']}>
      <DashboardLayout title="ECZ SBA Submission">
        <div className="space-y-6 max-w-4xl">
          <Link href="/dashboard/teacher/assessments/ecz">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to ECZ hub
            </Button>
          </Link>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Review before ECZ submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Form</Label>
                  <Select value={formLevel} onValueChange={setFormLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Academic year</Label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card p-2"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
              </div>

              <Button variant="outline" onClick={loadPreview} disabled={loading}>
                {loading ? 'Loading…' : 'Reload scores'}
              </Button>

              {validation.errors.length > 0 ? (
                <div className="rounded-xl border border-red-500/40 bg-red-50 dark:bg-red-950/20 p-4 space-y-2">
                  <p className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Must fix before submission
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 list-disc pl-5">
                    {validation.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-green-500/40 bg-green-50 dark:bg-green-950/20 p-4 flex items-center gap-2 text-green-800 dark:text-green-200 text-sm">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  Validation passed — ready to submit
                </div>
              )}

              {validation.warnings.length > 0 ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold mb-1">Warnings</p>
                  <ul className="list-disc pl-5">
                    {validation.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="text-sm text-royalPurple-text2">
                {formatted.length} learner score(s) loaded
              </p>

              <div className="flex flex-wrap gap-3">
                <Button onClick={downloadCsv} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
                <Button
                  onClick={submitToEcz}
                  disabled={!validation.valid || submitting}
                  className="bg-royalPurple-success"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Submitting…' : 'Submit to ECZ'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </StaffRouteGuard>
  )
}
