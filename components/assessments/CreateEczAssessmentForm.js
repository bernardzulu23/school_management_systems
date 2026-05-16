'use client'

import { useEffect, useState } from 'react'
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
import { AlertTriangle } from 'lucide-react'
import { SBA_TASK_TYPES } from '@/lib/ecz/ecz-subjects-data'
import { toast } from 'react-hot-toast'

const textareaClassName =
  'flex min-h-[80px] w-full bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2 disabled:cursor-not-allowed disabled:opacity-50'

const ZAMBIA_HINTS = 'e.g. farmer in Mkushi, market in Lusaka, minibus in Kitwe'

export function CreateEczAssessmentForm({ onSuccess, onCancel }) {
  const [subjects, setSubjects] = useState([])
  const [component, setComponent] = useState('SBA_TASK')
  const [formLevel, setFormLevel] = useState('1')
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Project')
  const [context, setContext] = useState('')
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/ecz/subjects/seed', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const list = Array.isArray(json?.data) ? json.data : []
        setSubjects(list)
        if (list[0]?.id) setSubjectId(list[0].id)
      })
      .catch(() => {})
  }, [])

  const handleFormLevelChange = (value) => {
    if (value === '4' && component === 'SBA_TASK') {
      setErrors(['Form 4 cannot have SBA tasks. Only Final Examination (70%) applies.'])
      return
    }
    setFormLevel(value)
    setErrors([])
  }

  const handleComponentChange = (value) => {
    if (value === 'SBA_TASK' && formLevel === '4') {
      setErrors(['SBA tasks cannot be created for Form 4 learners.'])
      return
    }
    setComponent(value)
    setErrors([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = []
    if (component === 'SBA_TASK' && formLevel === '4') {
      nextErrors.push('SBA cannot be created for Form 4')
    }
    if (!title.trim()) nextErrors.push('Title is required')
    if (!subjectId) nextErrors.push('Subject is required')
    if (component === 'SBA_TASK' && !context.trim()) {
      nextErrors.push('Zambian context scenario is required for SBA')
    }
    if (nextErrors.length) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/assessments/sba-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          component,
          formLevel: parseInt(formLevel, 10),
          subjectId,
          title: title.trim(),
          type,
          context: context.trim(),
          createDefaultRubric: component === 'SBA_TASK',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors([json.error || 'Failed to create assessment'])
        return
      }
      toast.success('ECZ assessment created')
      onSuccess?.()
    } catch {
      setErrors(['Network error'])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formLevel === '4' && component === 'SBA_TASK' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2 text-red-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Form 4 SBA Prevention: only Final Examination (70%) is allowed for Form 4.
        </div>
      )}

      {errors.length > 0 && (
        <ul className="text-sm text-red-600 list-disc pl-5 space-y-1">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Component *</Label>
          <Select value={component} onValueChange={handleComponentChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SBA_TASK">SBA Task (30%)</SelectItem>
              <SelectItem value="FINAL_EXAMINATION">Final Examination (70%)</SelectItem>
              <SelectItem value="PRACTICE_FORMATIVE">Practice / Formative (not graded)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Form Level *</Label>
          <Select value={formLevel} onValueChange={handleFormLevelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Form 1</SelectItem>
              <SelectItem value="2">Form 2</SelectItem>
              <SelectItem value="3">Form 3</SelectItem>
              <SelectItem value="4">Form 4 (exam only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Subject *</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {subjects.length === 0 && (
          <p className="text-xs text-amber-700 mt-1">
            No ECZ subjects yet. Ask admin to run ECZ subject setup from the ECZ hub.
          </p>
        )}
      </div>

      <div>
        <Label>Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="SBA Task 1: …"
        />
      </div>

      <div>
        <Label>Task type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SBA_TASK_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {component === 'SBA_TASK' && (
        <div>
          <Label>Zambian context scenario *</Label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={ZAMBIA_HINTS}
            rows={3}
            className={textareaClassName}
          />
          <p className="text-xs text-gray-500 mt-1">
            ECZ requires real-life Zambian contexts (locations, occupations, community settings).
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create assessment'}
        </Button>
      </div>
    </form>
  )
}
