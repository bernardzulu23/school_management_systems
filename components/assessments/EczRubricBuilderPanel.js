'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ECZ_SBA_TASK_TYPES } from '@/lib/ecz/ecz-rubric-builder'
import { EczRubricTable } from '@/components/assessments/EczRubricTable'
import { toast } from 'react-hot-toast'

const textareaClassName =
  'flex min-h-[72px] w-full bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 rounded-lg px-3 py-2 text-sm'

export function EczRubricBuilderPanel({
  subjects = [],
  subjectId,
  onSubjectIdChange,
  formLevel = '1',
  onFormLevelChange,
  title = '',
  onTitleChange,
  taskType = 'Project',
  onTaskTypeChange,
  description = '',
  onDescriptionChange,
  onCriteriaChange,
  /** When AI project-maker fills criteria, push them into the panel. */
  seedCriteria = null,
  embedded = false,
}) {
  const [numCriteria, setNumCriteria] = useState('4')
  const [criteria, setCriteria] = useState([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!Array.isArray(seedCriteria) || seedCriteria.length === 0) return
    setCriteria(seedCriteria)
    setNumCriteria(String(seedCriteria.length || 4))
  }, [seedCriteria])

  const selectedSubject = subjects.find((s) => String(s.id) === String(subjectId))

  const generate = async () => {
    if (formLevel === '4') {
      toast.error('Form 4 has no SBA — rubrics are not required.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ecz/rubric/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          subjectName: selectedSubject?.name,
          formLevel: parseInt(formLevel, 10),
          taskType,
          numCriteria: parseInt(numCriteria, 10),
          title,
          description,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate')
      const list = json.data?.criteria || []
      setCriteria(list)
      onCriteriaChange?.(list)
      toast.success('ECZ rubric generated')
    } catch (e) {
      toast.error(e.message || 'Could not generate rubric')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-royalPurple-text2">
          <strong className="text-royalPurple-text1">ECZ 4-level scale:</strong> Excellent (4), Good
          (3), Fair (2), Needs Improvement (1). Competence-based descriptors aligned with Zambia CBC
          / ECZ-ZECF 2023.
        </div>
      ) : null}

      {formLevel === '4' && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Form 4 — SBA is not administered. Only the final examination (70%) applies.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!embedded ? (
          <>
            <div>
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={onSubjectIdChange}>
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
              <Select value={formLevel} onValueChange={onFormLevelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Form 1</SelectItem>
                  <SelectItem value="2">Form 2</SelectItem>
                  <SelectItem value="3">Form 3</SelectItem>
                  <SelectItem value="4">Form 4 (no SBA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SBA task type (ECZ)</Label>
              <Select value={taskType} onValueChange={onTaskTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ECZ_SBA_TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
        <div>
          <Label>Number of criteria</Label>
          <Select value={numCriteria} onValueChange={setNumCriteria}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 criteria</SelectItem>
              <SelectItem value="4">4 criteria (recommended)</SelectItem>
              <SelectItem value="5">5 criteria</SelectItem>
              <SelectItem value="6">6 criteria</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!embedded ? (
          <>
            <div className="sm:col-span-2">
              <Label>Task title</Label>
              <Input
                value={title}
                onChange={(e) => onTitleChange?.(e.target.value)}
                placeholder="e.g. Maize market survey — Form 2 Agricultural Science"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Task description / Zambian scenario</Label>
              <textarea
                className={textareaClassName}
                value={description}
                onChange={(e) => onDescriptionChange?.(e.target.value)}
                placeholder="What learners must do, local context, and what they demonstrate…"
                rows={3}
              />
            </div>
          </>
        ) : null}
      </div>

      <Button type="button" onClick={generate} disabled={generating || formLevel === '4'}>
        {generating ? 'Generating…' : 'Generate ECZ rubric'}
      </Button>

      {criteria.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-royalPurple-text1 mb-2">Generated rubric</p>
          <EczRubricTable criteria={criteria} />
        </div>
      ) : null}
    </div>
  )
}
