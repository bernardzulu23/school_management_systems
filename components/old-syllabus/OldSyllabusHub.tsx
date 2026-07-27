'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { BookOpen, Layers, Sparkles, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'

type Tab = 'browse' | 'generate' | 'topics'

const GRADES = [
  { grade: 10, canonicalLevel: 'SS1', label: 'Grade 10 (SS1)' },
  { grade: 11, canonicalLevel: 'SS2', label: 'Grade 11 (SS2)' },
  { grade: 12, canonicalLevel: 'SS3', label: 'Grade 12 (SS3)' },
]

const CONTENT_TYPES = [
  { id: 'scheme', label: 'Scheme of Work' },
  { id: 'recordOfWork', label: 'Record of Work' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'test', label: 'Test' },
  { id: 'termAssessment', label: 'Mid / End of Term' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'lessonPlan', label: 'Lesson Plan' },
]

const MIN_WEEKS = 4
const MAX_WEEKS = 20

type SubjectRow = { id: string; subject: string }

type Topic = {
  topicId: string
  topicName: string
  domain?: string
  subtopics?: Array<{
    subtopicId: string
    subtopicName: string
    specificOutcomes?: Array<{ outcomeId: string; statement: string }>
  }>
}

type Props = {
  teacherId: string
  initialTab?: Tab
  initialSubject?: string
  initialGrade?: number
}

export function OldSyllabusHub({
  teacherId,
  initialTab = 'browse',
  initialSubject = '',
  initialGrade = 10,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear())
  const [selectedGrade, setSelectedGrade] = useState(
    GRADES.find((g) => g.grade === initialGrade) || GRADES[0]
  )
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [subject, setSubject] = useState(initialSubject)
  const [resolution, setResolution] = useState<{
    displayLabel?: string
    syllabusVersion?: string
  } | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [pastPapers, setPastPapers] = useState<any[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [contentType, setContentType] = useState('scheme')
  const [weeksPerTerm, setWeeksPerTerm] = useState('13')
  const [midTermWeek, setMidTermWeek] = useState('7')
  const [midTermWeekEnd, setMidTermWeekEnd] = useState('7')
  const [endOfTermWeek, setEndOfTermWeek] = useState('12')
  const [endOfTermWeekEnd, setEndOfTermWeekEnd] = useState('13')
  const [term, setTerm] = useState('Term 1')
  const [carryOverTopics, setCarryOverTopics] = useState<
    Array<{
      id: string
      topic: string
      topicKey?: string | null
      week?: number
      unitTitle?: string | null
      learningOutcomes?: string[]
      teachingActivities?: string[]
      assessmentMethod?: string
      assessmentMethods?: string[]
      resources?: string[]
      notes?: string
    }>
  >([])
  const [selectedCarryOverIds, setSelectedCarryOverIds] = useState<string[]>([])
  const [carryOverMessage, setCarryOverMessage] = useState('')
  const [loadingCarryOver, setLoadingCarryOver] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [error, setError] = useState('')

  const canonicalLevel = selectedGrade.canonicalLevel
  const needsPaper = contentType === 'test' || contentType === 'termAssessment'
  const needsTestSchedule = contentType === 'scheme' || contentType === 'recordOfWork'
  const activePaper = useMemo(() => pastPapers[0] || null, [pastPapers])

  const weeksPerTermNum = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Number(weeksPerTerm) || 13))
  const weekChoices = Array.from({ length: weeksPerTermNum }, (_, i) => i + 1)
  const midStart = Number(midTermWeek) || 7
  const midEnd = Number(midTermWeekEnd) || midStart
  const eotStart = Number(endOfTermWeek) || Math.max(1, weeksPerTermNum - 1)
  const eotEnd = Number(endOfTermWeekEnd) || eotStart
  const formatRange = (a: number, b: number) => (a === b ? `Week ${a}` : `Weeks ${a}–${b}`)

  useEffect(() => {
    const clamp = (raw: string, fallback: number) => {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 1 || n > weeksPerTermNum) return String(fallback)
      return String(n)
    }
    const midDefault = Math.min(weeksPerTermNum, Math.ceil(weeksPerTermNum / 2))
    const eotDefault = weeksPerTermNum
    const eotStartDefault = Math.max(1, weeksPerTermNum - 1)
    setMidTermWeek((prev) => clamp(prev, midDefault))
    setMidTermWeekEnd((prev) => clamp(prev, Number(midTermWeek) || midDefault))
    setEndOfTermWeek((prev) => clamp(prev, eotStartDefault))
    setEndOfTermWeekEnd((prev) => clamp(prev, eotDefault))
  }, [weeksPerTermNum])

  useEffect(() => {
    if (!needsTestSchedule || !subject) {
      setCarryOverTopics([])
      setSelectedCarryOverIds([])
      setCarryOverMessage('')
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingCarryOver(true)
      try {
        const qs = new URLSearchParams({
          subject,
          grade: String(selectedGrade.grade),
          term,
          year: String(academicYear),
        })
        const res = await fetch(`/api/curriculum/scheme/carry-over?${qs}`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setCarryOverTopics([])
          setSelectedCarryOverIds([])
          setCarryOverMessage(json.error || '')
          return
        }
        const topics = Array.isArray(json.topics) ? json.topics : []
        setCarryOverTopics(topics)
        setSelectedCarryOverIds(topics.map((t: { id: string }) => t.id))
        setCarryOverMessage(String(json.message || ''))
      } catch {
        if (!cancelled) {
          setCarryOverTopics([])
          setSelectedCarryOverIds([])
        }
      } finally {
        if (!cancelled) setLoadingCarryOver(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [needsTestSchedule, subject, selectedGrade.grade, term, academicYear])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tabParam = String(params.get('tab') || '').toLowerCase()
    if (tabParam === 'browse' || tabParam === 'generate' || tabParam === 'topics') {
      setTab(tabParam as Tab)
    }
    const subj = String(params.get('subject') || '').trim()
    if (subj) setSubject(subj)
    const g = Number(params.get('grade') || 0)
    const gradeRow = GRADES.find((x) => x.grade === g)
    if (gradeRow) setSelectedGrade(gradeRow)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/curriculum/old-syllabus', { credentials: 'include' })
        const json = await res.json()
        if (cancelled || !res.ok) return
        const list = (json.subjects || []) as SubjectRow[]
        setSubjects(list)
        setSubject((prev) => prev || list[0]?.subject || 'Mathematics')
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError('')
      try {
        const qs = new URLSearchParams({
          canonicalLevel,
          academicYear: String(academicYear),
        })
        const res = await fetch(`/api/curriculum/resolve-syllabus?${qs}`, {
          credentials: 'include',
        })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || 'Failed to resolve syllabus')
          setResolution(null)
          return
        }
        setResolution(json)
        if (json.syllabusVersion === 'CBC' && tab === 'generate') {
          toast.error('CBC is active for this level — opening Teaching Studio')
          router.replace('/dashboard/teacher/teaching-studio')
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Resolve failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canonicalLevel, academicYear, tab, router])

  const loadTopics = useCallback(async () => {
    if (!subject) return
    setLoadingTopics(true)
    try {
      const qs = new URLSearchParams({ subject, grade: String(selectedGrade.grade) })
      const res = await fetch(`/api/curriculum/old-syllabus?${qs}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load topics')
      const list = (json.document?.gradeContent?.[0]?.topics || []) as Topic[]
      setTopics(list)
      setPastPapers(json.pastPapers || [])
      setSelectedTopicIds((prev) =>
        prev.length
          ? prev.filter((id) => list.some((t) => t.topicId === id))
          : list.slice(0, 3).map((t) => t.topicId)
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load topics')
      setTopics([])
    } finally {
      setLoadingTopics(false)
    }
  }, [subject, selectedGrade.grade])

  useEffect(() => {
    if (tab === 'topics' || tab === 'generate') void loadTopics()
  }, [tab, loadTopics])

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
          grade: selectedGrade.grade,
          selectedTopicIds,
          questionCount: 8,
          weekCount: weeksPerTermNum,
          term,
          midTermWeek: midStart,
          midTermWeekEnd: midEnd,
          endOfTermWeek: eotStart,
          endOfTermWeekEnd: eotEnd,
          carryOverTopics: carryOverTopics.filter((t) => selectedCarryOverIds.includes(t.id)),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setResult(json.result)
      toast.success('Generated successfully')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'browse', label: 'Subjects' },
    { id: 'topics', label: 'Topics' },
    { id: 'generate', label: 'Generate' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Zap className="h-7 w-7 text-amber-500" />
            Old Syllabus Studio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pre-CBC O-Level planning — browse subjects, explore topics, and generate schemes,
            quizzes, and tests
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Teacher · {teacherId.slice(0, 8)}…</p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Level & year
          </CardTitle>
          <CardDescription>Same control strip pattern as Teaching Studio</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] space-y-1">
            <Label>Academic year</Label>
            <Input
              type="number"
              value={academicYear}
              onChange={(e) => setAcademicYear(Number(e.target.value))}
            />
          </div>
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label>Grade / level</Label>
            <Select
              value={String(selectedGrade.grade)}
              onValueChange={(v) => {
                const g = GRADES.find((x) => x.grade === Number(v))
                if (g) setSelectedGrade(g)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g.grade} value={String(g.grade)}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label>Subject</Label>
            <Select value={subject || undefined} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {(subjects.length ? subjects : [{ id: 'math', subject: 'Mathematics' }]).map(
                  (s) => (
                    <SelectItem key={s.id || s.subject} value={s.subject}>
                      {s.subject}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadTopics()}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {resolution ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <div>
              <span className="font-medium">Resolved:</span> {resolution.displayLabel} ·{' '}
              <code className="text-xs">{resolution.syllabusVersion}</code>
            </div>
            {resolution.syllabusVersion === 'CBC' ? (
              <Link
                href="/dashboard/teacher/teaching-studio"
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
              >
                Open Teaching Studio
              </Link>
            ) : (
              <span className="text-emerald-700">Old syllabus is active for this level</span>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === 'browse' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" />
                  Validated subjects
                </CardTitle>
                <CardDescription>
                  Open a subject to browse topics for Grade {selectedGrade.grade}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!subjects.length ? (
                  <p className="text-sm text-muted-foreground">
                    No VALID OldSyllabusDocument rows yet. Run{' '}
                    <code>npx tsx scripts/ingest-old-syllabus.ts --fixture</code>.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {subjects.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                      >
                        <span className="font-medium">{s.subject}</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSubject(s.subject)
                              setTab('topics')
                            }}
                          >
                            Topics
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSubject(s.subject)
                              setTab('generate')
                            }}
                          >
                            Generate
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                Quick actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => setTab('generate')}>
                Open generator
              </Button>
              <Button className="w-full" variant="outline" onClick={() => setTab('topics')}>
                Browse topics
              </Button>
              <Link
                href="/dashboard/teacher/teaching-studio"
                className="inline-flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                CBC Teaching Studio
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'topics' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {subject} · Grade {selectedGrade.grade}
              </CardTitle>
              <CardDescription>
                {loadingTopics
                  ? 'Loading topics…'
                  : `${topics.length} topic(s) · ${pastPapers.length} past paper template(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pastPapers.length ? (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="font-medium mb-1">Past paper templates</div>
                  <ul className="space-y-1 text-muted-foreground">
                    {pastPapers.map((p) => (
                      <li key={p.id}>
                        {p.paperCode}/{p.paperNumber} ({p.year}) · {p.totalMarks} marks ·{' '}
                        {p.durationMinutes} min
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {!topics.length && !loadingTopics ? (
                <p className="text-sm text-muted-foreground">No topics for this grade.</p>
              ) : (
                topics.map((topic) => (
                  <details key={topic.topicId} className="rounded-lg border p-3">
                    <summary className="cursor-pointer font-medium">
                      {topic.topicId} {topic.topicName}{' '}
                      <span className="text-muted-foreground font-normal">
                        ({topic.domain || '—'})
                      </span>
                    </summary>
                    <ul className="mt-2 space-y-2 text-sm">
                      {(topic.subtopics || []).map((st) => (
                        <li key={st.subtopicId}>
                          <div className="font-medium">
                            {st.subtopicId} {st.subtopicName}
                          </div>
                          <ul className="ml-4 list-disc text-muted-foreground">
                            {(st.specificOutcomes || []).map((o) => (
                              <li key={o.outcomeId}>
                                {o.outcomeId}: {o.statement}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))
              )}
              <Button onClick={() => setTab('generate')}>Generate from these topics</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'generate' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" />
                  Generator
                </CardTitle>
                <CardDescription>
                  Pick a content type and topics — same studio chrome as CBC schemes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Content type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {needsTestSchedule ? (
                    <div className="space-y-1">
                      <Label>Term</Label>
                      <Select value={term} onValueChange={setTerm}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Term 1', 'Term 2', 'Term 3'].map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>

                {needsTestSchedule ? (
                  <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
                    <div>
                      <h4 className="font-medium text-sky-900">Test schedule (CBC-aligned)</h4>
                      <p className="mt-1 text-sm text-sky-700">
                        Mid-term and end-of-term weeks are assessment-only (no teaching topics). Use
                        a range when tests span multiple weeks (e.g. end-of-term 12–13).
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Weeks per term</Label>
                        <Select value={String(weeksPerTermNum)} onValueChange={setWeeksPerTerm}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              { length: MAX_WEEKS - MIN_WEEKS + 1 },
                              (_, i) => MIN_WEEKS + i
                            ).map((w) => (
                              <SelectItem key={w} value={String(w)}>
                                {w} weeks
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Mid-term weeks</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={midTermWeek} onValueChange={setMidTermWeek}>
                            <SelectTrigger>
                              <SelectValue placeholder="From" />
                            </SelectTrigger>
                            <SelectContent>
                              {weekChoices.map((w) => (
                                <SelectItem key={`mid-s-${w}`} value={String(w)}>
                                  Week {w}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={midTermWeekEnd} onValueChange={setMidTermWeekEnd}>
                            <SelectTrigger>
                              <SelectValue placeholder="To" />
                            </SelectTrigger>
                            <SelectContent>
                              {weekChoices.map((w) => (
                                <SelectItem key={`mid-e-${w}`} value={String(w)}>
                                  Week {w}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatRange(midStart, midEnd)} · recommended week{' '}
                          {Math.ceil(weeksPerTermNum / 2)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label>End-of-term weeks</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={endOfTermWeek} onValueChange={setEndOfTermWeek}>
                            <SelectTrigger>
                              <SelectValue placeholder="From" />
                            </SelectTrigger>
                            <SelectContent>
                              {weekChoices.map((w) => (
                                <SelectItem key={`eot-s-${w}`} value={String(w)}>
                                  Week {w}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={endOfTermWeekEnd} onValueChange={setEndOfTermWeekEnd}>
                            <SelectTrigger>
                              <SelectValue placeholder="To" />
                            </SelectTrigger>
                            <SelectContent>
                              {weekChoices.map((w) => (
                                <SelectItem key={`eot-e-${w}`} value={String(w)}>
                                  Week {w}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatRange(eotStart, eotEnd)} · recommended{' '}
                          {Math.max(1, weeksPerTermNum - 1)}–{weeksPerTermNum}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3">
                      <div className="font-medium text-amber-950">Continue unfinished topics</div>
                      <p className="mt-1 text-xs text-amber-800">
                        Unfinished teaching weeks from the previous term are listed below. Selected
                        items are placed first in the new scheme.
                      </p>
                      {loadingCarryOver ? (
                        <p className="mt-2 text-xs text-amber-700">Checking previous term…</p>
                      ) : (
                        <>
                          <p className="mt-2 text-xs text-amber-700">{carryOverMessage || '—'}</p>
                          {carryOverTopics.length > 0 ? (
                            <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded border bg-white p-2 text-sm">
                              <div className="mb-1 flex gap-2">
                                <button
                                  type="button"
                                  className="text-xs underline"
                                  onClick={() =>
                                    setSelectedCarryOverIds(carryOverTopics.map((t) => t.id))
                                  }
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  className="text-xs underline"
                                  onClick={() => setSelectedCarryOverIds([])}
                                >
                                  Clear
                                </button>
                              </div>
                              {carryOverTopics.map((t) => {
                                const checked = selectedCarryOverIds.includes(t.id)
                                return (
                                  <label key={t.id} className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      className="mt-1"
                                      checked={checked}
                                      onChange={() => {
                                        setSelectedCarryOverIds((prev) =>
                                          checked
                                            ? prev.filter((id) => id !== t.id)
                                            : [...prev, t.id]
                                        )
                                      }}
                                    />
                                    <span>
                                      <span className="font-medium">{t.topic}</span>
                                      {t.week != null ? (
                                        <span className="text-muted-foreground">
                                          {' '}
                                          · prev week {t.week}
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {needsPaper ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                    <div className="font-medium">Past paper template</div>
                    {!activePaper ? (
                      <p className="mt-1 text-amber-800">
                        No validated past paper for {subject}. Tests cannot be generated until one
                        exists.
                      </p>
                    ) : (
                      <p className="mt-1">
                        Will use{' '}
                        <strong>
                          {activePaper.paperCode}/{activePaper.paperNumber} ({activePaper.year})
                        </strong>
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>Topics</Label>
                  <div className="max-h-56 space-y-1 overflow-auto rounded-lg border p-3 text-sm">
                    {topics.map((t) => {
                      const checked = selectedTopicIds.includes(t.topicId)
                      return (
                        <label key={t.topicId} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedTopicIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== t.topicId)
                                  : [...prev, t.topicId]
                              )
                            }}
                          />
                          {t.topicId} {t.topicName}
                        </label>
                      )
                    })}
                    {!topics.length ? (
                      <p className="text-muted-foreground">Select a subject with topics first.</p>
                    ) : null}
                  </div>
                </div>

                <Button type="button" disabled={busy} onClick={() => void onGenerate()}>
                  {busy ? 'Generating…' : 'Generate'}
                </Button>

                {result ? (
                  <div className="space-y-3 rounded-lg border p-4">
                    {result.similarityCheck?.holdForReview ? (
                      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                        Similarity check flagged overlap with the source past paper. Review before
                        save.
                      </div>
                    ) : null}

                    {result.downloadUrl ? (
                      <a
                        href={result.downloadUrl}
                        download={result.downloadFilename || 'old-syllabus-export.docx'}
                        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                      >
                        Download Word document
                      </a>
                    ) : null}

                    {Array.isArray(result.weeks) && result.weeks.length > 0 ? (
                      <div className="space-y-2">
                        <div className="font-medium text-sm">
                          Scheme of work · {result.weeks.length} weeks
                          {result.testSchedule
                            ? ` · mid ${formatRange(
                                Number(result.testSchedule.midTermWeek),
                                Number(
                                  result.testSchedule.midTermWeekEnd ??
                                    result.testSchedule.midTermWeek
                                )
                              )} · EOT ${formatRange(
                                Number(result.testSchedule.endOfTermWeek),
                                Number(
                                  result.testSchedule.endOfTermWeekEnd ??
                                    result.testSchedule.endOfTermWeek
                                )
                              )}`
                            : ''}
                        </div>
                        <div className="max-h-96 overflow-auto rounded border">
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-muted">
                              <tr>
                                <th className="p-2">Wk</th>
                                <th className="p-2">Type</th>
                                <th className="p-2">Topic</th>
                                <th className="p-2">Outcomes</th>
                                <th className="p-2">Activities</th>
                                <th className="p-2">Assessment</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.weeks.map((w: any) => {
                                const isTest =
                                  w.weekType === 'mid_term_test' ||
                                  w.weekType === 'end_of_term_test'
                                return (
                                  <tr
                                    key={w.week}
                                    className={cn(
                                      'border-t align-top',
                                      isTest ? 'bg-amber-50' : undefined
                                    )}
                                  >
                                    <td className="p-2">{w.week}</td>
                                    <td className="p-2">
                                      {w.weekType === 'mid_term_test'
                                        ? 'Mid-term'
                                        : w.weekType === 'end_of_term_test'
                                          ? 'End-of-term'
                                          : 'Teaching'}
                                    </td>
                                    <td className="p-2 font-medium">{w.topic}</td>
                                    <td className="p-2">
                                      {(w.learningOutcomes || []).slice(0, 3).join('; ')}
                                    </td>
                                    <td className="p-2">
                                      {(w.teachingActivities || []).slice(0, 3).join('; ')}
                                    </td>
                                    <td className="p-2">{w.assessmentMethod || ''}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    {result.contentType === 'lessonPlan' && result.content ? (
                      <div className="space-y-2">
                        <div className="font-medium text-sm">Lesson plan preview</div>
                        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-3 text-xs">
                          {String(result.content).slice(0, 8000)}
                        </pre>
                      </div>
                    ) : null}

                    {Array.isArray(result.flashcards) && result.flashcards.length > 0 ? (
                      <div className="space-y-2">
                        <div className="font-medium text-sm">
                          Flashcards · {result.flashcards.length}
                        </div>
                        <ul className="space-y-2 text-sm">
                          {result.flashcards.map((c: any, i: number) => (
                            <li key={c.id || i} className="rounded border p-2">
                              <div className="font-medium">{c.front}</div>
                              <div className="text-muted-foreground">Answer: {c.answer}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {Array.isArray(result.questions) && result.questions.length > 0 ? (
                      <>
                        <div className="font-medium text-sm">
                          Generated {result.questions.length} items
                          {!result.canSave ? ' (save disabled until review)' : ''}
                        </div>
                        <ol className="ml-5 list-decimal space-y-3 text-sm">
                          {result.questions.map((q: any) => (
                            <li key={q.id}>
                              <div className="font-medium">
                                {q.topicName} {q.required === false ? '(optional)' : ''}
                              </div>
                              <div>{q.question}</div>
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : null}

                    {(result.contentType === 'quiz' ||
                      result.contentType === 'test' ||
                      result.contentType === 'termAssessment') && (
                      <Button type="button" variant="outline" disabled={!result.canSave}>
                        Save (enabled only when similarity check is clear)
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Schemes and lesson plans now use the same week-table / MoE structure as CBC Teaching
                Studio.
              </p>
              <p>Use validated past papers for tests and term assessments.</p>
              <p>Switch to Topics to inspect outcomes before generating.</p>
              <p>
                CBC schools should use{' '}
                <Link className="underline" href="/dashboard/teacher/teaching-studio">
                  Teaching Studio
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
