'use client'

import { useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useCurriculumTopics } from '@/hooks/useCurriculumTopics'

/**
 * Curriculum topic control — ENFORCED dropdown when form/grade + subject are selected.
 *
 * Contract (all formulation UIs: quizzes, tests, flashcards, story weaver, lesson plans, etc.):
 * 1. Topic is disabled until subject is set (and grade, unless topics are injected).
 * 2. When syllabus topics exist, selection MUST come from the dropdown (no free-text).
 * 3. Free-text is only allowed when `allowFreeFormWhenEmpty` is explicitly true AND the
 *    syllabus list is empty (legacy / subjects without corpus).
 *
 * Pass `topics` / `topicsLoading` / `topicsError` to inject a preloaded list (e.g. student
 * `/api/student/curriculum-topics`) and skip the internal teacher curriculum-topics fetch.
 *
 * @param {{
 *   subject: string
 *   gradeOrForm: string
 *   value: string
 *   onChange: (topic: string) => void
 *   label?: string
 *   required?: boolean
 *   className?: string
 *   id?: string
 *   allowFreeFormWhenEmpty?: boolean
 *   selectClassName?: string
 *   topics?: string[]
 *   topicsLoading?: boolean
 *   topicsError?: string | null
 *   requireGrade?: boolean
 * }} props
 */
export function CurriculumTopicSelect({
  subject,
  gradeOrForm,
  value,
  onChange,
  label = 'Curriculum topic',
  required = true,
  className = '',
  id = 'curriculum-topic',
  allowFreeFormWhenEmpty = false,
  selectClassName = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  topics: topicsProp,
  topicsLoading: topicsLoadingProp,
  topicsError: topicsErrorProp,
  requireGrade = true,
}) {
  const injectTopics = Array.isArray(topicsProp)
  const fetched = useCurriculumTopics(injectTopics ? '' : subject, injectTopics ? '' : gradeOrForm)
  const topics = injectTopics ? topicsProp : fetched.topics
  const loading = injectTopics ? Boolean(topicsLoadingProp) : fetched.loading
  const error = injectTopics ? topicsErrorProp || null : fetched.error

  const hasTopics = topics.length > 0
  const subjectReady = Boolean(String(subject || '').trim())
  const gradeReady = Boolean(String(gradeOrForm || '').trim())
  const ready = subjectReady && (injectTopics || !requireGrade || gradeReady)
  const disabled = !ready || loading
  const useDropdown = ready && (hasTopics || !allowFreeFormWhenEmpty)

  // Clear topic when form/subject not ready.
  useEffect(() => {
    if (!ready && String(value || '').trim()) onChange('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Keep value aligned with syllabus list; clear invalid free-text when dropdown is required.
  useEffect(() => {
    if (loading || !ready) return
    const current = String(value || '').trim()
    if (!hasTopics) {
      if (!allowFreeFormWhenEmpty && current) onChange('')
      return
    }
    if (!current) return
    const lower = current.toLowerCase()
    const exact = topics.find((t) => t.toLowerCase() === lower)
    if (exact) {
      if (exact !== value) onChange(exact)
      return
    }
    const fuzzy = topics.find((t) => {
      const tl = t.toLowerCase()
      return tl.includes(lower) || lower.includes(tl)
    })
    if (fuzzy) {
      if (fuzzy !== value) onChange(fuzzy)
      return
    }
    onChange('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, hasTopics, loading, value, ready, allowFreeFormWhenEmpty])

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <Label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </Label>
      {useDropdown ? (
        <select
          id={id}
          className={selectClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || (!hasTopics && !loading)}
          required={required}
        >
          <option value="">
            {!subjectReady
              ? 'Select subject first'
              : !ready
                ? 'Select form and subject first'
                : loading
                  ? 'Loading syllabus topics…'
                  : hasTopics
                    ? 'Choose syllabus topic…'
                    : 'No syllabus topics for this form/subject'}
          </option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!ready || loading}
          required={required}
          placeholder={
            loading
              ? 'Loading curriculum topics…'
              : !ready
                ? 'Select form and subject first'
                : 'No syllabus topics found — enter a topic'
          }
        />
      )}
      {error ? <p className="text-xs text-amber-700">{error}</p> : null}
      {ready && hasTopics ? (
        <p className="text-xs text-muted-foreground">
          Topics come from the CDC / ECZ syllabus
          {gradeOrForm ? ` for ${gradeOrForm}` : ''}. Free-text topics are not allowed.
        </p>
      ) : null}
      {ready && !loading && !hasTopics && !error && !allowFreeFormWhenEmpty ? (
        <p className="text-xs text-amber-700">
          No syllabus topics are available for this subject and form. Add curriculum data or pick
          another subject/form.
        </p>
      ) : null}
    </div>
  )
}
