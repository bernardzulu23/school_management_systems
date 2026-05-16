'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { computeRubricScore, SBA_TASK_MARKS, SBA_TERM_TEST_MARKS } from '@/lib/ecz/ecz-compliance'
import { toast } from 'react-hot-toast'

const LEVEL_OPTIONS = [
  { value: '4', label: 'Excellent (4)' },
  { value: '3', label: 'Good (3)' },
  { value: '2', label: 'Fair (2)' },
  { value: '1', label: 'Needs Improvement (1)' },
]

function formLevelPattern(level) {
  const n = Number(level)
  return new RegExp(`^form\\s*${n}\\b`, 'i')
}

export function RecordSbaScoreForm({ sbaTasks = [], onSuccess }) {
  const [formLevel, setFormLevel] = useState('1')
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()))
  const [assessmentId, setAssessmentId] = useState('')
  const [taskNumber, setTaskNumber] = useState('1')
  const [studentId, setStudentId] = useState('')
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [criterionLevels, setCriterionLevels] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const filteredTasks = useMemo(
    () =>
      (sbaTasks || []).filter(
        (t) => t.component === 'SBA_TASK' && String(t.formLevel) === formLevel
      ),
    [sbaTasks, formLevel]
  )

  const selectedAssessment = useMemo(
    () => filteredTasks.find((t) => t.id === assessmentId),
    [filteredTasks, assessmentId]
  )

  const criteria = selectedAssessment?.rubric?.criteria || []

  useEffect(() => {
    if (filteredTasks.length && !filteredTasks.some((t) => t.id === assessmentId)) {
      setAssessmentId(filteredTasks[0].id)
    }
  }, [filteredTasks, assessmentId])

  useEffect(() => {
    if (!selectedAssessment?.id) return
    const next = {}
    for (const c of selectedAssessment.rubric?.criteria || []) {
      next[c.id] = '3'
    }
    setCriterionLevels(next)
  }, [selectedAssessment?.id])

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true)
    try {
      const res = await fetch('/api/students?limit=500', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load students')
      const list = Array.isArray(json.data) ? json.data : []
      const pattern = formLevelPattern(formLevel)
      setStudents(
        list.filter((s) => {
          const cls = String(s.class || s.classRef?.name || '')
          return pattern.test(cls)
        })
      )
    } catch (e) {
      toast.error(e.message || 'Could not load learners')
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }, [formLevel])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const rubricPreview = useMemo(() => {
    let excellentCount = 0
    let goodCount = 0
    let fairCount = 0
    let needsImprovementCount = 0
    for (const c of criteria) {
      const v = criterionLevels[c.id] || '3'
      if (v === '4') excellentCount++
      else if (v === '3') goodCount++
      else if (v === '2') fairCount++
      else needsImprovementCount++
    }
    const { calculatedScore } = computeRubricScore({
      excellentCount,
      goodCount,
      fairCount,
      needsImprovementCount,
    })
    const tn = Number(taskNumber)
    const displayScore =
      tn === 4 ? Math.min(SBA_TERM_TEST_MARKS, calculatedScore * 2) : calculatedScore
    const maxMarks = tn === 4 ? SBA_TERM_TEST_MARKS : SBA_TASK_MARKS
    return { excellentCount, goodCount, fairCount, needsImprovementCount, displayScore, maxMarks }
  }, [criteria, criterionLevels, taskNumber])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!assessmentId || !studentId) {
      toast.error('Select an assessment and learner')
      return
    }
    if (criteria.length === 0) {
      toast.error('This assessment has no rubric criteria')
      return
    }

    setSubmitting(true)
    try {
      const { excellentCount, goodCount, fairCount, needsImprovementCount } = rubricPreview
      const res = await fetch('/api/assessments/sba-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assessmentId,
          studentId,
          formLevel: parseInt(formLevel, 10),
          academicYear: parseInt(academicYear, 10),
          taskNumber: parseInt(taskNumber, 10),
          excellentCount,
          goodCount,
          fairCount,
          needsImprovementCount,
          rubricBreakdown: { criterionLevels, criteria: criteria.map((c) => c.id) },
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to save score')
      toast.success(
        `Score saved: ${json.data?.totalSBAScore ?? rubricPreview.displayScore} / 100 total SBA`
      )
      onSuccess?.(json.data)
    } catch (err) {
      toast.error(err.message || 'Failed to record score')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>Form level</Label>
          <Select value={formLevel} onValueChange={setFormLevel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Form 1</SelectItem>
              <SelectItem value="2">Form 2</SelectItem>
              <SelectItem value="3">Form 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Academic year</Label>
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((offset) => {
                const y = new Date().getFullYear() - offset
                return (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>SBA task</Label>
          <Select value={assessmentId} onValueChange={setAssessmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select task" />
            </SelectTrigger>
            <SelectContent>
              {filteredTasks.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No SBA tasks for this form
                </SelectItem>
              ) : (
                filteredTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title} ({t.subject?.name})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Component</Label>
          <Select value={taskNumber} onValueChange={setTaskNumber}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Task 1 (max 20)</SelectItem>
              <SelectItem value="2">Task 2 (max 20)</SelectItem>
              <SelectItem value="3">Task 3 (max 20)</SelectItem>
              <SelectItem value="4">Term test (max 40)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Learner</Label>
        <Select value={studentId} onValueChange={setStudentId} disabled={loadingStudents}>
          <SelectTrigger>
            <SelectValue placeholder={loadingStudents ? 'Loading…' : 'Select learner'} />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.exam_number ? ` (${s.exam_number})` : ''} — {s.class}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loadingStudents && students.length === 0 && (
          <p className="text-xs text-amber-700 mt-1">
            No learners found for Form {formLevel}. Check class names match &quot;Form {formLevel}
            …&quot;.
          </p>
        )}
      </div>

      {criteria.length > 0 ? (
        <div className="rounded-lg border border-royalPurple-border p-4 space-y-3 bg-royalPurple-card2/50">
          <p className="text-sm font-medium text-royalPurple-text1">4-level ECZ rubric</p>
          {criteria.map((c) => (
            <div key={c.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <span className="text-sm text-royalPurple-text2">{c.name}</span>
              <Select
                value={criterionLevels[c.id] || '3'}
                onValueChange={(v) => setCriterionLevels((prev) => ({ ...prev, [c.id]: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <p className="text-sm font-semibold text-royalPurple-text1 pt-2 border-t border-royalPurple-border">
            Calculated mark for this component: {rubricPreview.displayScore} /{' '}
            {rubricPreview.maxMarks}
          </p>
        </div>
      ) : (
        selectedAssessment && (
          <p className="text-sm text-muted-foreground">
            No rubric on this task. Create a new SBA task to auto-generate the 4-level rubric.
          </p>
        )
      )}

      <Button type="submit" disabled={submitting || !assessmentId || !studentId}>
        {submitting ? 'Saving…' : 'Record SBA score'}
      </Button>
    </form>
  )
}
