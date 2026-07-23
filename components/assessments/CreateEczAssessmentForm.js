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
import { AlertTriangle, Sparkles } from 'lucide-react'
import { ECZ_SBA_TASK_TYPES } from '@/lib/ecz/ecz-rubric-builder'
import { EczRubricBuilderPanel } from '@/components/assessments/EczRubricBuilderPanel'
import { CurriculumTopicSelect } from '@/components/curriculum/CurriculumTopicSelect'
import { toast } from 'react-hot-toast'

const textareaClassName =
  'flex min-h-[80px] w-full bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2 disabled:cursor-not-allowed disabled:opacity-50'

const ZAMBIA_HINTS = 'e.g. farmer in Mkushi, market in Lusaka, minibus in Kitwe'

export function CreateEczAssessmentForm({ onSuccess, onCancel }) {
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [component, setComponent] = useState('SBA_TASK')
  const [formLevel, setFormLevel] = useState('1')
  const [subjectId, setSubjectId] = useState('')
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Project')
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [lastAiProject, setLastAiProject] = useState(null)
  const [rubricCriteria, setRubricCriteria] = useState([])
  const [numCriteria, setNumCriteria] = useState(4)
  const [exemplars, setExemplars] = useState([])
  const [selectedExemplarId, setSelectedExemplarId] = useState('')
  const [cloning, setCloning] = useState(false)

  useEffect(() => {
    if (formLevel && formLevel !== '4') {
      fetch(`/api/ecz/exemplars?form=${formLevel}&type=sba_task`, { credentials: 'include' })
        .then((r) => r.json())
        .then((json) => setExemplars(Array.isArray(json?.data) ? json.data : []))
        .catch(() => setExemplars([]))
    }
  }, [formLevel])

  const applyExemplar = (ex) => {
    if (!ex) return
    setTitle(ex.title || '')
    setContext(ex.context || '')
    setType(ex.taskType || 'Project')
    if (ex.task) setContext((c) => (c ? c : ex.context))
  }

  const cloneFromExemplar = async () => {
    if (!selectedExemplarId || !subjectId) {
      toast.error('Select exemplar and subject')
      return
    }
    setCloning(true)
    try {
      const res = await fetch(`/api/ecz/exemplars/${selectedExemplarId}/clone`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          classId: classId || undefined,
          formLevel: parseInt(formLevel, 10),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Clone failed')
      toast.success('Assessment cloned from ECSEOL exemplar')
      onSuccess?.()
    } catch (e) {
      toast.error(e.message || 'Could not clone exemplar')
    } finally {
      setCloning(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/ecz/subjects/seed?sync=true', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/teaching-assignments', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([subjectsJson, assignmentsJson]) => {
        const list = Array.isArray(subjectsJson?.data) ? subjectsJson.data : []
        setSubjects(list)
        if (list[0]?.id) setSubjectId(String(list[0].id))

        const assignments = Array.isArray(assignmentsJson?.data) ? assignmentsJson.data : []
        const byId = new Map()
        for (const a of assignments) {
          if (a?.classId && a?.className) {
            byId.set(String(a.classId), { id: a.classId, name: a.className })
          }
        }
        const classList = Array.from(byId.values()).sort((a, b) =>
          String(a.name).localeCompare(String(b.name))
        )
        setClasses(classList)
        if (classList[0]?.id) setClassId(String(classList[0].id))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setTopic('')
  }, [subjectId, formLevel])

  const selectedSubject = subjects.find((s) => String(s.id) === String(subjectId))
  const gradeOrForm = formLevel === '4' ? 'Form 4' : `Form ${formLevel}`
  const canGenerateAi =
    component === 'SBA_TASK' &&
    formLevel !== '4' &&
    Boolean(selectedSubject?.name) &&
    Boolean(topic.trim())

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

  const handleGenerateAi = async () => {
    if (!canGenerateAi) {
      toast.error('Select form, subject, and a syllabus topic first')
      return
    }
    setGeneratingAi(true)
    setErrors([])
    try {
      const variationSeed =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const res = await fetch('/api/ai/project-maker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grade: gradeOrForm,
          subject: selectedSubject.name,
          topic: topic.trim(),
          taskType: type || 'Project',
          forceRefresh: true,
          variationSeed,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'AI project generation failed')

      const project = json.project || {}
      if (project.title) setTitle(project.title)
      if (project.taskType) setType(project.taskType)
      if (json.context) setContext(json.context)
      else if (project.context) setContext(project.context)

      const criteria = Array.isArray(json.rubricCriteria) ? json.rubricCriteria : []
      if (criteria.length) {
        setRubricCriteria(criteria)
        setNumCriteria(criteria.length)
      }
      setLastAiProject(project)
      toast.success('AI project brief generated — review and create when ready')
    } catch (e) {
      toast.error(e.message || 'Could not generate project')
      setErrors([e.message || 'AI project generation failed'])
    } finally {
      setGeneratingAi(false)
    }
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
          classId: classId || undefined,
          title: title.trim(),
          type,
          description: context.trim(),
          context: context.trim(),
          numCriteria: rubricCriteria.length || numCriteria,
          rubricCriteria: rubricCriteria.length > 0 ? rubricCriteria : undefined,
          createDefaultRubric: component === 'SBA_TASK' && rubricCriteria.length === 0,
          exemplarId: selectedExemplarId || undefined,
          generatedByAI: Boolean(rubricCriteria.length && topic.trim()),
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
        <Label>Grade / Class</Label>
        <Select value={classId || 'none'} onValueChange={(v) => setClassId(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select grade (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {classes.length === 0 && (
          <p className="text-xs text-royalPurple-text3 mt-1">
            No assigned classes found. You can still create the SBA task without a grade.
          </p>
        )}
      </div>

      <div>
        <Label>Subject *</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name} {s.code ? `(${s.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {subjects.length === 0 && (
          <p className="text-xs text-amber-700 mt-1">
            No ECZ subjects yet. Open the ECZ SBA Hub and click Sync ECZ subjects.
          </p>
        )}
        {selectedSubject?.construct ? (
          <div className="mt-2 rounded-lg border border-royalPurple-border/50 bg-royalPurple-deep/50 p-3 text-xs text-royalPurple-text2">
            <p className="font-semibold text-accent mb-1">Construct (ECZ guidelines)</p>
            <p className="leading-relaxed">{selectedSubject.construct}</p>
            {Array.isArray(selectedSubject.constructElements) &&
            selectedSubject.constructElements.length > 0 ? (
              <ul className="mt-2 space-y-1 list-none">
                {selectedSubject.constructElements.map((el) => (
                  <li key={el.id || el.elementNumber}>
                    <span className="font-medium text-royalPurple-text1">{el.elementNumber}.</span>{' '}
                    {el.statement}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {component === 'SBA_TASK' && formLevel !== '4' ? (
        <CurriculumTopicSelect
          subject={selectedSubject?.name || ''}
          gradeOrForm={gradeOrForm}
          value={topic}
          onChange={setTopic}
          label="Curriculum topic"
          required
          allowFreeFormWhenEmpty={false}
          id="ecz-project-topic"
        />
      ) : null}

      {component === 'SBA_TASK' && formLevel !== '4' && exemplars.length > 0 && (
        <div className="rounded-lg border border-royalPurple-border/50 bg-royalPurple-deep/30 p-4 space-y-3">
          <p className="text-sm font-medium text-royalPurple-text1">Clone from ECSEOL exemplar</p>
          <Select
            value={selectedExemplarId || 'none'}
            onValueChange={(v) => {
              const id = v === 'none' ? '' : v
              setSelectedExemplarId(id)
              const ex = exemplars.find((e) => e.id === id)
              if (ex) applyExemplar(ex)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Browse exemplars…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None — create manually</SelectItem>
              {exemplars.map((ex) => (
                <SelectItem key={ex.id} value={ex.id}>
                  {ex.title} ({ex.subjectName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedExemplarId && (
            <Button
              type="button"
              variant="secondary"
              disabled={cloning}
              onClick={cloneFromExemplar}
            >
              {cloning ? 'Cloning…' : 'One-click clone into live assessment'}
            </Button>
          )}
        </div>
      )}

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
            {ECZ_SBA_TASK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {component === 'SBA_TASK' && formLevel !== '4' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerateAi}
            disabled={generatingAi || !canGenerateAi}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generatingAi
              ? 'Generating…'
              : type === 'Project'
                ? 'Generate AI project brief'
                : 'Generate AI SBA brief'}
          </Button>
          {lastAiProject ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const { downloadAssessmentPaper } =
                      await import('@/lib/exports/downloadAssessmentPaper')
                    await downloadAssessmentPaper(
                      {
                        kind: 'project',
                        title: lastAiProject.title || title || 'SBA Project',
                        subject: selectedSubject?.name,
                        grade: gradeOrForm,
                        topic,
                        includeAnswers: true,
                        project: {
                          ...lastAiProject,
                          criteria: rubricCriteria.length
                            ? rubricCriteria.map((c) => ({
                                name: c.name,
                                excellent: c.excellent,
                                good: c.good,
                                fair: c.fair,
                                needsImprovement:
                                  c.needsImprovement || c.needs_improvement || c.needsImpr,
                              }))
                            : lastAiProject.criteria,
                        },
                      },
                      'pdf'
                    )
                  } catch (e) {
                    toast.error(e.message || 'PDF export failed')
                  }
                }}
              >
                Save PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const { downloadAssessmentPaper } =
                      await import('@/lib/exports/downloadAssessmentPaper')
                    await downloadAssessmentPaper(
                      {
                        kind: 'project',
                        title: lastAiProject.title || title || 'SBA Project',
                        subject: selectedSubject?.name,
                        grade: gradeOrForm,
                        topic,
                        includeAnswers: true,
                        project: {
                          ...lastAiProject,
                          criteria: rubricCriteria.length
                            ? rubricCriteria.map((c) => ({
                                name: c.name,
                                excellent: c.excellent,
                                good: c.good,
                                fair: c.fair,
                                needsImprovement:
                                  c.needsImprovement || c.needs_improvement || c.needsImpr,
                              }))
                            : lastAiProject.criteria,
                        },
                      },
                      'word'
                    )
                  } catch (e) {
                    toast.error(e.message || 'Word export failed')
                  }
                }}
              >
                Save Word
              </Button>
            </>
          ) : null}
          <p className="text-xs text-royalPurple-text3">
            Fresh brief every click (title, context, steps, deliverables, rubric).
          </p>
        </div>
      ) : null}

      {component === 'SBA_TASK' && (
        <>
          <div>
            <Label>Zambian context scenario *</Label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={ZAMBIA_HINTS}
              rows={6}
              className={textareaClassName}
            />
            <p className="text-xs text-gray-500 mt-1">
              ECZ requires real-life Zambian contexts (locations, occupations, community settings).
            </p>
          </div>
          {formLevel !== '4' ? (
            <div className="rounded-lg border border-royalPurple-border/50 p-4 space-y-3">
              <p className="text-sm font-semibold text-royalPurple-text1">
                ECZ rubric builder (4-level descriptors)
              </p>
              <p className="text-xs text-royalPurple-text3">
                Generate criteria before saving, or a default rubric is created from the task type
                and subject.
              </p>
              <EczRubricBuilderPanel
                embedded
                subjects={subjects}
                subjectId={subjectId}
                onSubjectIdChange={setSubjectId}
                formLevel={formLevel}
                onFormLevelChange={handleFormLevelChange}
                title={title}
                onTitleChange={setTitle}
                taskType={type}
                onTaskTypeChange={setType}
                description={context}
                onDescriptionChange={setContext}
                seedCriteria={rubricCriteria}
                onCriteriaChange={(list) => {
                  setRubricCriteria(list)
                  setNumCriteria(list.length || 4)
                }}
              />
            </div>
          ) : null}
        </>
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
