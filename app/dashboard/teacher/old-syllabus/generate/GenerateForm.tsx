'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

const CONTENT_TYPES = [
  { id: 'scheme', label: 'Scheme of Work' },
  { id: 'recordOfWork', label: 'Record of Work' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'test', label: 'Test' },
  { id: 'termAssessment', label: 'Mid / End of Term' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'lessonPlan', label: 'Lesson Plan' },
]

const GRADE_TO_LEVEL = { 10: 'SS1', 11: 'SS2', 12: 'SS3' }

export default function OldSyllabusGenerateForm() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const search = useSearchParams()

  const [academicYear, setAcademicYear] = useState(new Date().getFullYear())
  const [grade, setGrade] = useState(Number(search.get('grade') || 10))
  const [subject, setSubject] = useState(search.get('subject') || 'Mathematics')
  const [contentType, setContentType] = useState('quiz')
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedTopicIds, setSelectedTopicIds] = useState([])
  const [pastPapers, setPastPapers] = useState([])
  const [resolution, setResolution] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canonicalLevel = GRADE_TO_LEVEL[grade] || 'SS1'
  const needsPaper = contentType === 'test' || contentType === 'termAssessment'

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) router.replace('/login')
  }, [isAuthenticated, isLoading, user, router])

  useEffect(() => {
    fetch('/api/curriculum/old-syllabus', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setSubjects(j.subjects || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const qs = new URLSearchParams({ canonicalLevel, academicYear: String(academicYear) })
      const res = await fetch(`/api/curriculum/resolve-syllabus?${qs}`, { credentials: 'include' })
      const json = await res.json()
      if (cancelled) return
      setResolution(json)
      if (json.syllabusVersion === 'CBC') {
        router.replace('/dashboard/teacher/teaching-studio')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canonicalLevel, academicYear, router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const qs = new URLSearchParams({ subject, grade: String(grade) })
      const res = await fetch(`/api/curriculum/old-syllabus?${qs}`, { credentials: 'include' })
      const json = await res.json()
      if (cancelled || !res.ok) return
      const list = json.document?.gradeContent?.[0]?.topics || []
      setTopics(list)
      setPastPapers(json.pastPapers || [])
      setSelectedTopicIds(list.slice(0, 3).map((t) => t.topicId))
    })()
    return () => {
      cancelled = true
    }
  }, [subject, grade])

  const activePaper = useMemo(() => pastPapers[0] || null, [pastPapers])

  async function onGenerate() {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/curriculum/old-syllabus/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          canonicalLevel,
          academicYear,
          subject,
          grade,
          selectedTopicIds,
          questionCount: 8,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setResult(json.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardLayout title="Old Syllabus Generator">
      <div className="space-y-6 max-w-4xl">
        <Link href="/dashboard/teacher/old-syllabus" className="text-sm underline">
          ← Old syllabus
        </Link>

        {resolution ? (
          <p className="text-sm">
            Active: <strong>{resolution.displayLabel}</strong> ({resolution.syllabusVersion})
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm space-y-1">
            <span className="font-medium">Content type</span>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              {CONTENT_TYPES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="font-medium">Academic year</span>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              value={academicYear}
              onChange={(e) => setAcademicYear(Number(e.target.value))}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="font-medium">Subject</span>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {(subjects.length ? subjects.map((s) => s.subject) : ['Mathematics']).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="font-medium">Grade</span>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            >
              <option value={10}>Grade 10</option>
              <option value={11}>Grade 11</option>
              <option value={12}>Grade 12</option>
            </select>
          </label>
        </div>

        {needsPaper ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <div className="font-medium">Past paper template</div>
            {!activePaper ? (
              <p className="text-amber-800 mt-1">
                No validated past paper for {subject}. Tests cannot be generated until one exists.
              </p>
            ) : (
              <p className="mt-1">
                Will use{' '}
                <strong>
                  {activePaper.paperCode}/{activePaper.paperNumber} ({activePaper.year})
                </strong>
                {' — '}
                {(activePaper.structureJson?.sections || [])
                  .map(
                    (s) =>
                      `${s.sectionLabel || 'Paper'}: ${s.choiceRule}${
                        s.chooseCount ? ` (${s.chooseCount} of ${s.questionCount})` : ''
                      }`
                  )
                  .join('; ')}
              </p>
            )}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="font-medium text-sm">Topics</div>
          <div className="max-h-56 overflow-auto rounded-lg border p-3 space-y-1 text-sm">
            {topics.map((t) => {
              const checked = selectedTopicIds.includes(t.topicId)
              return (
                <label key={t.topicId} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedTopicIds((prev) =>
                        checked ? prev.filter((id) => id !== t.topicId) : [...prev, t.topicId]
                      )
                    }}
                  />
                  {t.topicId} {t.topicName}
                </label>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onGenerate}
          className="rounded-md bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? 'Generating…' : 'Generate'}
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {result ? (
          <div className="space-y-3 rounded-lg border p-4">
            {result.similarityCheck?.holdForReview ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                Similarity check flagged overlap with the source past paper. Review before save /
                send to class.
              </div>
            ) : null}

            <div className="font-medium text-sm">
              Generated {result.questions?.length || 0} items
              {!result.canSave ? ' (save disabled until review)' : ''}
            </div>
            <ol className="space-y-3 text-sm list-decimal ml-5">
              {(result.questions || []).map((q) => (
                <li key={q.id}>
                  <div className="font-medium">
                    {q.topicName} {q.required === false ? '(optional)' : ''}
                  </div>
                  <div>{q.question}</div>
                </li>
              ))}
            </ol>

            <button
              type="button"
              disabled={!result.canSave}
              className="rounded-md border px-4 py-2 text-sm disabled:opacity-40"
            >
              Save (enabled only when similarity check is clear)
            </button>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
