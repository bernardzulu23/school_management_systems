'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ECZ_TERM_WEIGHTS, ECZ_SBA_MARKS } from '@/lib/ecz/ecz-rubric-builder'
import { toast } from 'react-hot-toast'

function emptyRow(sn) {
  return {
    sn,
    name: '',
    task1: '',
    task2: '',
    task3: '',
    termTest: '',
    total: null,
  }
}

export function EczSbaTrackingSheet({ subjects = [] }) {
  const [subjectId, setSubjectId] = useState('')
  const [formLevel, setFormLevel] = useState('1')
  const [term, setTerm] = useState('1')
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()))
  const [schoolName, setSchoolName] = useState('')
  const [centreNumber, setCentreNumber] = useState('')
  const [rows, setRows] = useState(() => [1, 2, 3, 4, 5].map(emptyRow))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (subjects[0]?.id && !subjectId) setSubjectId(subjects[0].id)
  }, [subjects, subjectId])

  const updateRow = (sn, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.sn !== sn) return r
        const next = { ...r, [field]: value }
        const t1 = Math.min(ECZ_SBA_MARKS.taskMax, Math.max(0, Number(next.task1) || 0))
        const t2 = Math.min(ECZ_SBA_MARKS.taskMax, Math.max(0, Number(next.task2) || 0))
        const t3 = Math.min(ECZ_SBA_MARKS.taskMax, Math.max(0, Number(next.task3) || 0))
        const tt = Math.min(ECZ_SBA_MARKS.termTestMax, Math.max(0, Number(next.termTest) || 0))
        const hasAny =
          next.task1 !== '' || next.task2 !== '' || next.task3 !== '' || next.termTest !== ''
        next.total = hasAny ? t1 + t2 + t3 + tt : null
        return next
      })
    )
  }

  const summary = useMemo(() => {
    const scores = rows.map((r) => r.total).filter((t) => typeof t === 'number' && t > 0)
    if (!scores.length) return null
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    return {
      count: scores.length,
      avg,
      max: Math.max(...scores),
      min: Math.min(...scores),
      termWeight: ECZ_TERM_WEIGHTS[Number(term)]?.percent ?? 20,
    }
  }, [rows, term])

  const addRows = (n = 1) => {
    setRows((prev) => {
      const start = prev.length
      return [...prev, ...Array.from({ length: n }, (_, i) => emptyRow(start + i + 1))]
    })
  }

  const saveScores = useCallback(async () => {
    const subj = subjects.find((s) => s.id === subjectId)
    if (!subj) {
      toast.error('Select a subject')
      return
    }
    if (formLevel === '4') {
      toast.error('Form 4 has no SBA tracking')
      return
    }

    setSaving(true)
    try {
      const tasksRes = await fetch(
        `/api/assessments/sba-tasks?formLevel=${formLevel}&subjectId=${subjectId}&component=SBA_TASK`,
        { credentials: 'include' }
      )
      const tasksJson = await tasksRes.json()
      const tasks = Array.isArray(tasksJson.data) ? tasksJson.data : []
      const sbaTasks = tasks.filter((t) => t.component === 'SBA_TASK').slice(0, 3)

      if (sbaTasks.length < 1) {
        toast.error('Create at least one SBA task for this subject and form first.')
        return
      }

      const studentsRes = await fetch('/api/students?limit=500', { credentials: 'include' })
      const studentsJson = await studentsRes.json()
      const students = Array.isArray(studentsJson.data) ? studentsJson.data : []
      const pattern = new RegExp(`^form\\s*${formLevel}\\b`, 'i')

      let saved = 0
      for (const row of rows) {
        if (!row.name.trim()) continue
        const student = students.find(
          (s) =>
            pattern.test(String(s.class || s.classRef?.name || '')) &&
            String(s.name || '')
              .toLowerCase()
              .includes(row.name.trim().toLowerCase())
        )
        if (!student) continue

        const taskScores = [
          { num: 1, val: row.task1 },
          { num: 2, val: row.task2 },
          { num: 3, val: row.task3 },
        ]
        for (let i = 0; i < Math.min(3, sbaTasks.length); i++) {
          const val = taskScores[i].val
          if (val === '' || val == null) continue
          const assessment = sbaTasks[i]
          const level = Math.min(4, Math.max(1, Math.round(Number(val) / 5) || 2))
          const res = await fetch('/api/assessments/sba-scores', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assessmentId: assessment.id,
              studentId: student.id,
              formLevel: parseInt(formLevel, 10),
              academicYear: parseInt(academicYear, 10),
              taskNumber: i + 1,
              excellentCount: level === 4 ? 4 : 0,
              goodCount: level === 3 ? 4 : 0,
              fairCount: level === 2 ? 4 : 0,
              needsImprovementCount: level === 1 ? 4 : 0,
            }),
          })
          if (res.ok) saved++
        }
      }
      toast.success(`Saved ${saved} score entries (matched learners by name)`)
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [subjects, subjectId, formLevel, academicYear, rows])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-royalPurple-text2">
        ECZ weighting: <strong>Term 1 = 20%</strong> · <strong>Term 2 = 30%</strong> ·{' '}
        <strong>Term 3 = 50%</strong>. Each task max {ECZ_SBA_MARKS.taskMax}; term test max{' '}
        {ECZ_SBA_MARKS.termTestMax}; total SBA = {ECZ_SBA_MARKS.totalMax}. Submit to ECZ by{' '}
        <strong>31 January</strong>.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
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
              <SelectItem value="1">Form 1</SelectItem>
              <SelectItem value="2">Form 2</SelectItem>
              <SelectItem value="3">Form 3</SelectItem>
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
              {Object.entries(ECZ_TERM_WEIGHTS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Academic year</Label>
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
        </div>
        <div>
          <Label>School name</Label>
          <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
        </div>
        <div>
          <Label>Centre number</Label>
          <Input value={centreNumber} onChange={(e) => setCentreNumber(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-royalPurple-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-royalPurple-muted/50">
              <th className="p-2 text-left">S/N</th>
              <th className="p-2 text-left min-w-[140px]">Learner name</th>
              <th className="p-2 text-center">Task 1 /{ECZ_SBA_MARKS.taskMax}</th>
              <th className="p-2 text-center">Task 2 /{ECZ_SBA_MARKS.taskMax}</th>
              <th className="p-2 text-center">Task 3 /{ECZ_SBA_MARKS.taskMax}</th>
              <th className="p-2 text-center">Term test /{ECZ_SBA_MARKS.termTestMax}</th>
              <th className="p-2 text-center bg-green-500/10">Total /{ECZ_SBA_MARKS.totalMax}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sn} className="border-t border-royalPurple-border/40">
                <td className="p-1 text-center text-royalPurple-text3">{r.sn}</td>
                <td className="p-1">
                  <input
                    className="w-full bg-transparent border border-royalPurple-border/40 rounded px-2 py-1"
                    value={r.name}
                    onChange={(e) => updateRow(r.sn, 'name', e.target.value)}
                    placeholder="Learner name"
                  />
                </td>
                {['task1', 'task2', 'task3', 'termTest'].map((f) => (
                  <td key={f} className="p-1">
                    <input
                      type="number"
                      min={0}
                      max={f === 'termTest' ? ECZ_SBA_MARKS.termTestMax : ECZ_SBA_MARKS.taskMax}
                      className="w-full text-center bg-transparent border border-royalPurple-border/40 rounded px-1 py-1"
                      value={r[f]}
                      onChange={(e) => updateRow(r.sn, f, e.target.value)}
                    />
                  </td>
                ))}
                <td
                  className={`p-1 text-center font-semibold ${
                    (r.total ?? 0) > ECZ_SBA_MARKS.totalMax ? 'text-red-400' : 'text-green-300'
                  }`}
                >
                  {r.total != null ? r.total : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addRows(1)}>
          + Add learner
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addRows(5)}>
          + Add 5 learners
        </Button>
        <Button type="button" onClick={saveScores} disabled={saving}>
          {saving ? 'Saving…' : 'Save scores to system'}
        </Button>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
          <div className="rounded-lg border border-royalPurple-border/40 p-3">
            <p className="text-xs text-royalPurple-text3">Learners scored</p>
            <p className="text-xl font-bold">{summary.count}</p>
          </div>
          <div className="rounded-lg border border-royalPurple-border/40 p-3">
            <p className="text-xs text-royalPurple-text3">Class average</p>
            <p className="text-xl font-bold text-green-300">{summary.avg}</p>
          </div>
          <div className="rounded-lg border border-royalPurple-border/40 p-3">
            <p className="text-xs text-royalPurple-text3">Highest</p>
            <p className="text-xl font-bold">{summary.max}</p>
          </div>
          <div className="rounded-lg border border-green-500/30 p-3">
            <p className="text-xs text-green-300">Term weight</p>
            <p className="text-xl font-bold">{summary.termWeight}%</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-royalPurple-text3">Enter scores to see class summary.</p>
      )}
    </div>
  )
}
