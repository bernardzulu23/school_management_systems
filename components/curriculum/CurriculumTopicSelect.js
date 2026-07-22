'use client'

import { useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useCurriculumTopics } from '@/hooks/useCurriculumTopics'

/**
 * Topic control: dropdown when curriculum topics exist for form+subject; otherwise free-text.
 * Per Validation_folder: when syllabus topics exist, selection must come from the dropdown.
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
 * }} props
 */
export function CurriculumTopicSelect({
  subject,
  gradeOrForm,
  value,
  onChange,
  label = 'Curriculum topic',
  required = false,
  className = '',
  id = 'curriculum-topic',
  allowFreeFormWhenEmpty = true,
}) {
  const { topics, loading, error } = useCurriculumTopics(subject, gradeOrForm)
  const hasTopics = topics.length > 0
  const disabled = !String(subject || '').trim() || !String(gradeOrForm || '').trim() || loading

  // Keep value aligned with syllabus list (exact or fuzzy); clear if form/subject changed away.
  useEffect(() => {
    if (loading || !hasTopics) return
    const current = String(value || '').trim()
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
    // onChange identity may change each render — only re-sync when topics/value change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, hasTopics, loading, value])

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <Label htmlFor={id}>
        {hasTopics ? label : allowFreeFormWhenEmpty ? 'Topic' : label}
        {required ? ' *' : ''}
      </Label>
      {hasTopics ? (
        <select
          id={id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
        >
          <option value="">{loading ? 'Loading topics…' : 'Choose syllabus topic…'}</option>
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
          disabled={disabled && !allowFreeFormWhenEmpty}
          required={required && allowFreeFormWhenEmpty}
          placeholder={
            loading
              ? 'Loading curriculum topics…'
              : !String(subject || '').trim() || !String(gradeOrForm || '').trim()
                ? 'Select form and subject first'
                : allowFreeFormWhenEmpty
                  ? 'No syllabus topics found — enter a topic'
                  : 'No syllabus topics for this form/subject'
          }
        />
      )}
      {error ? <p className="text-xs text-amber-700">{error}</p> : null}
      {hasTopics ? (
        <p className="text-xs text-muted-foreground">
          Topics come from the CDC / ECZ syllabus for {gradeOrForm}.
        </p>
      ) : null}
    </div>
  )
}
