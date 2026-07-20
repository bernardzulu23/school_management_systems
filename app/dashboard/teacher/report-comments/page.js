'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { FeatureGate } from '@/components/FeatureGate'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIStream } from '@/hooks/useAIStream'
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
import {
  attendanceFromRecords,
  buildReportCommentPayload,
  canGenerateReportComment,
  gradeLabelFromClass,
  marksFromResult,
  pickLatestResult,
  subjectsForClass,
  uniqueClassesFromAssignments,
} from '@/lib/ai/reportCommentForm'

const emptyEditable = {
  marks: '',
  maxMarks: '',
  behavior: '',
  attendance: '',
  strengths: '',
  areasForImprovement: '',
}

export default function TeacherReportCommentsPage() {
  const { text, loading, error, start, reset, stop } = useAIStream('/api/ai/report-comments', {
    plainText: true,
  })

  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [pupils, setPupils] = useState([])
  const [pupilsLoading, setPupilsLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)

  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    grade: '',
    subjectId: '',
    subject: '',
    ...emptyEditable,
  })

  const classes = useMemo(() => uniqueClassesFromAssignments(assignments), [assignments])
  const subjects = useMemo(
    () => subjectsForClass(assignments, selectedClassId),
    [assignments, selectedClassId]
  )
  const selectedClass = useMemo(
    () => classes.find((c) => c.classId === selectedClassId) || null,
    [classes, selectedClassId]
  )
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.subjectId === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  )
  const rosterSubjectId = useMemo(
    () => selectedSubjectId || subjects[0]?.subjectId || '',
    [selectedSubjectId, subjects]
  )

  const canGenerate = useMemo(() => canGenerateReportComment(form), [form])

  useEffect(() => {
    let cancelled = false
    const loadAssignments = async () => {
      setAssignmentsLoading(true)
      try {
        const res = await fetch('/api/teaching-assignments', {
          cache: 'no-store',
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed to load teaching assignments')
        const data = Array.isArray(json?.data) ? json.data : []
        if (cancelled) return
        setAssignments(data)
        const classList = uniqueClassesFromAssignments(data)
        if (classList.length > 0) {
          setSelectedClassId((prev) => prev || classList[0].classId)
        }
      } catch (e) {
        if (!cancelled) {
          setAssignments([])
          toast.error(e.message || 'Failed to load teaching assignments')
        }
      } finally {
        if (!cancelled) setAssignmentsLoading(false)
      }
    }
    loadAssignments()
    return () => {
      cancelled = true
    }
  }, [])

  // When class changes: reset student/subject, set grade from year_group
  useEffect(() => {
    if (!selectedClassId) return
    const classList = uniqueClassesFromAssignments(assignments)
    const classInfo = classList.find((c) => c.classId === selectedClassId)
    const classSubjects = subjectsForClass(assignments, selectedClassId)
    setSelectedStudentId('')
    setSelectedSubjectId(classSubjects[0]?.subjectId || '')
    setPupils([])
    setForm((p) => ({
      ...p,
      studentId: '',
      studentName: '',
      grade: gradeLabelFromClass(classInfo),
      subjectId: classSubjects[0]?.subjectId || '',
      subject: classSubjects[0]?.subjectName || '',
      ...emptyEditable,
    }))
  }, [selectedClassId, assignments])

  // Load class roster (pupils API needs classId + subjectId; use roster subject for the class)
  useEffect(() => {
    let cancelled = false
    const loadPupils = async () => {
      if (!selectedClassId || !rosterSubjectId) {
        setPupils([])
        return
      }
      setPupilsLoading(true)
      try {
        const res = await fetch(
          `/api/teacher/pupils?classId=${encodeURIComponent(selectedClassId)}&subjectId=${encodeURIComponent(rosterSubjectId)}`,
          { cache: 'no-store', credentials: 'include' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to load students')
        if (cancelled) return
        setPupils(Array.isArray(json?.data) ? json.data : [])
      } catch (e) {
        if (!cancelled) {
          setPupils([])
          toast.error(e.message || 'Failed to load students')
        }
      } finally {
        if (!cancelled) setPupilsLoading(false)
      }
    }
    loadPupils()
    return () => {
      cancelled = true
    }
  }, [selectedClassId, rosterSubjectId])

  const applyStudentAndSubjectContext = useCallback(
    async (studentId, subjectId) => {
      if (!studentId || !subjectId || !selectedClassId) return
      setContextLoading(true)
      try {
        const pupil = pupils.find((p) => p.id === studentId)
        const subject = subjects.find((s) => s.subjectId === subjectId)
        const year = new Date().getFullYear()
        const terms = [`Term 1`, `Term 2`, `Term 3`]

        const [studentRes, ...resultsResList] = await Promise.all([
          fetch(`/api/students/${encodeURIComponent(studentId)}`, {
            cache: 'no-store',
            credentials: 'include',
          }),
          ...terms.map((term) =>
            fetch(
              `/api/teacher/results?classId=${encodeURIComponent(selectedClassId)}&subjectId=${encodeURIComponent(subjectId)}&studentId=${encodeURIComponent(studentId)}&term=${encodeURIComponent(term)}&year=${encodeURIComponent(year)}`,
              { cache: 'no-store', credentials: 'include' }
            )
          ),
        ])

        const studentJson = await studentRes.json().catch(() => ({}))
        const attendanceRecords = Array.isArray(studentJson?.data?.attendance)
          ? studentJson.data.attendance
          : []
        const { label: attendanceLabel } = attendanceFromRecords(attendanceRecords)

        let latest = null
        for (const res of resultsResList) {
          if (!res.ok) continue
          const json = await res.json().catch(() => ({}))
          const rows = Array.isArray(json?.data) ? json.data : []
          const candidate = pickLatestResult(rows, subjectId)
          if (!candidate) continue
          if (
            !latest ||
            new Date(candidate.updatedAt || 0).getTime() > new Date(latest.updatedAt || 0).getTime()
          ) {
            latest = candidate
          }
        }

        // Fallback: student.results from the student endpoint (any term)
        if (!latest && Array.isArray(studentJson?.data?.results)) {
          latest = pickLatestResult(studentJson.data.results, subjectId)
        }

        const { marks, maxMarks } = marksFromResult(latest)

        setForm((p) => ({
          ...p,
          studentId,
          studentName: String(pupil?.name || studentJson?.data?.name || p.studentName).trim(),
          grade: gradeLabelFromClass(selectedClass) || p.grade,
          subjectId,
          subject: String(subject?.subjectName || p.subject).trim(),
          marks,
          maxMarks,
          attendance: attendanceLabel,
          // Keep behavior / strengths / improvement editable; only clear when switching context
          behavior: p.behavior,
          strengths: p.strengths,
          areasForImprovement: p.areasForImprovement,
        }))
      } catch {
        toast.error('Could not load marks or attendance for this student')
      } finally {
        setContextLoading(false)
      }
    },
    [pupils, subjects, selectedClassId, selectedClass]
  )

  useEffect(() => {
    if (!selectedStudentId || !selectedSubjectId) return
    applyStudentAndSubjectContext(selectedStudentId, selectedSubjectId)
  }, [selectedStudentId, selectedSubjectId, applyStudentAndSubjectContext])

  const onClassChange = (classId) => {
    setSelectedClassId(classId)
  }

  const onStudentChange = (studentId) => {
    setSelectedStudentId(studentId)
    const pupil = pupils.find((p) => p.id === studentId)
    setForm((p) => ({
      ...p,
      studentId,
      studentName: String(pupil?.name || '').trim(),
      ...emptyEditable,
      grade: gradeLabelFromClass(selectedClass) || p.grade,
      subjectId: selectedSubject?.subjectId || p.subjectId,
      subject: selectedSubject?.subjectName || p.subject,
    }))
  }

  const onSubjectChange = (subjectId) => {
    setSelectedSubjectId(subjectId)
    const subject = subjects.find((s) => s.subjectId === subjectId)
    setForm((p) => ({
      ...p,
      subjectId,
      subject: String(subject?.subjectName || '').trim(),
      marks: '',
      maxMarks: '',
      attendance: '',
    }))
  }

  const handleReset = () => {
    reset()
    setSelectedStudentId('')
    setForm((p) => ({
      ...p,
      studentId: '',
      studentName: '',
      ...emptyEditable,
      grade: gradeLabelFromClass(selectedClass),
      subjectId: selectedSubject?.subjectId || '',
      subject: selectedSubject?.subjectName || '',
    }))
  }

  const handleGenerate = () => {
    const payload = buildReportCommentPayload(form)
    if (
      payload.marks === undefined ||
      payload.maxMarks === undefined ||
      !Number.isFinite(payload.marks) ||
      !Number.isFinite(payload.maxMarks)
    ) {
      toast.error('Enter marks and max marks (or select a subject with a saved result)')
      return
    }
    start(payload)
  }

  return (
    <DashboardLayout title="AI Report Comments">
      <div className="space-y-4">
        <Link href="/dashboard/teacher">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <FeatureGate featureId="ai-report-comments">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Report Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignmentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-royalPurple-text2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your classes…
                </div>
              ) : classes.length === 0 ? (
                <p className="text-sm text-royalPurple-text2">
                  No teaching assignments found. Ask your headteacher to assign your classes and
                  subjects first.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={selectedClassId} onValueChange={onClassChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.classId} value={c.classId}>
                            {c.className}
                            {c.classYearGroup ? ` (${c.classYearGroup})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select
                      value={selectedStudentId}
                      onValueChange={onStudentChange}
                      disabled={pupilsLoading || pupils.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            pupilsLoading
                              ? 'Loading students…'
                              : pupils.length === 0
                                ? 'No students in this class'
                                : 'Select student'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {pupils.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.exam_number ? ` · ${p.exam_number}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select
                      value={selectedSubjectId}
                      onValueChange={onSubjectChange}
                      disabled={subjects.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
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

                  <div className="space-y-2">
                    <Label>Grade / form</Label>
                    <Input value={form.grade} readOnly className="bg-royalPurple-card/50" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div className="space-y-2">
                      <Label>Marks{contextLoading ? ' (loading…)' : ''}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.marks}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            marks: e.target.value === '' ? '' : Number(e.target.value),
                          }))
                        }
                        placeholder="From latest result"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Marks</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.maxMarks}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            maxMarks: e.target.value === '' ? '' : Number(e.target.value),
                          }))
                        }
                        placeholder="Usually 100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Behavior</Label>
                    <Input
                      value={form.behavior}
                      onChange={(e) => setForm((p) => ({ ...p, behavior: e.target.value }))}
                      placeholder="Optional — e.g. Cooperative"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attendance</Label>
                    <Input
                      value={form.attendance}
                      onChange={(e) => setForm((p) => ({ ...p, attendance: e.target.value }))}
                      placeholder="From recent register, if available"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Strengths (comma separated)</Label>
                    <Input
                      value={form.strengths}
                      onChange={(e) => setForm((p) => ({ ...p, strengths: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Areas for Improvement (comma separated)</Label>
                    <Input
                      value={form.areasForImprovement}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, areasForImprovement: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              {error ? <UpgradePrompt error={error} onDismiss={reset} /> : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !canGenerate || contextLoading}
                >
                  {loading ? 'Generating...' : 'Generate Comment'}
                </Button>
                {loading ? (
                  <Button variant="outline" onClick={stop}>
                    Stop
                  </Button>
                ) : null}
                <Button variant="outline" onClick={handleReset} disabled={loading}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1">Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm text-royalPurple-text2">
                {text || 'No output yet.'}
              </div>
            </CardContent>
          </Card>
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
