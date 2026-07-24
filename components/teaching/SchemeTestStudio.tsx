'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type SchemeOption = {
  id: string
  subject: string
  gradeOrForm: string
  term: string
  year: number
  status?: string
}

type EligibleTopic = {
  week: number
  topic: string
  topicTitle: string
  topicKey: string
  learningOutcomes?: string[]
}

type Props = {
  schemes: SchemeOption[]
  selectedSchemeId: string
  onSchemeChange: (id: string) => void
  onRefreshSchemes?: () => void
}

type Slot = 'mid_term' | 'end_of_term'

export function SchemeTestStudio({
  schemes,
  selectedSchemeId,
  onSchemeChange,
  onRefreshSchemes,
}: Props) {
  const [slot, setSlot] = useState<Slot>('mid_term')
  const [topics, setTopics] = useState<EligibleTopic[]>([])
  const [cutoffWeek, setCutoffWeek] = useState<number | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [draftWarning, setDraftWarning] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState('medium')
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [paper, setPaper] = useState<any>(null)
  const [assignments, setAssignments] = useState<
    Array<{
      id: string
      subjectId: string
      classId: string
      subjectName?: string
      className?: string
      subject?: { id: string; name: string }
      class?: { id: string; name: string }
    }>
  >([])
  const [assignmentId, setAssignmentId] = useState('')

  const selectedScheme = useMemo(
    () => schemes.find((s) => s.id === selectedSchemeId) || null,
    [schemes, selectedSchemeId]
  )

  const matchingAssignments = useMemo(() => {
    if (!selectedScheme) return assignments
    const subj = String(selectedScheme.subject || '').toLowerCase()
    const grade = String(selectedScheme.gradeOrForm || '').toLowerCase()
    const filtered = assignments.filter((a) => {
      const name = String(a.subjectName || a.subject?.name || '').toLowerCase()
      const cls = String(a.className || a.class?.name || '').toLowerCase()
      const subjectOk = !subj || name.includes(subj) || subj.includes(name)
      const gradeOk =
        !grade ||
        cls.includes(grade.replace(/\s+/g, '')) ||
        cls.includes(grade) ||
        grade.includes(cls)
      return subjectOk || gradeOk
    })
    return filtered.length ? filtered : assignments
  }, [assignments, selectedScheme])

  const selectedAssignment =
    matchingAssignments.find((a) => a.id === assignmentId) || matchingAssignments[0] || null

  const loadTopics = useCallback(async () => {
    if (!selectedSchemeId) {
      setTopics([])
      setSelectedKeys(new Set())
      setPaper(null)
      return
    }
    setLoadingTopics(true)
    setPaper(null)
    try {
      const qs = new URLSearchParams({ schemeId: selectedSchemeId, slot })
      const res = await fetch(`/api/teaching/scheme-test-topics?${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || 'Failed to load scheme topics')
        setTopics([])
        setWarning(json.error || null)
        return
      }
      setTopics(Array.isArray(json.topics) ? json.topics : [])
      setCutoffWeek(json.cutoffWeek ?? null)
      setWarning(json.warning || null)
      setDraftWarning(json.draftWarning || null)
      setSelectedKeys(new Set())
    } catch {
      toast.error('Failed to load scheme topics')
    } finally {
      setLoadingTopics(false)
    }
  }, [selectedSchemeId, slot])

  useEffect(() => {
    loadTopics()
  }, [loadTopics])

  useEffect(() => {
    let cancelled = false
    async function loadAssignments() {
      try {
        const res = await fetch('/api/teaching-assignments', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        const items = Array.isArray(json)
          ? json
          : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.assignments)
              ? json.assignments
              : []
        setAssignments(
          items.map((a: any) => ({
            id: a.id,
            subjectId: a.subjectId || a.subject?.id,
            classId: a.classId || a.class?.id,
            subjectName: a.subjectName || a.subject?.name,
            className: a.className || a.class?.name,
            subject: a.subject,
            class: a.class,
          }))
        )
      } catch {
        if (!cancelled) setAssignments([])
      }
    }
    loadAssignments()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const slotParam = String(params.get('slot') || '').toLowerCase()
    if (slotParam === 'end_of_term' || slotParam === 'eot') setSlot('end_of_term')
    if (slotParam === 'mid_term' || slotParam === 'midterm') setSlot('mid_term')
  }, [])

  useEffect(() => {
    if (!matchingAssignments.length) {
      setAssignmentId('')
      return
    }
    if (!matchingAssignments.some((a) => a.id === assignmentId)) {
      setAssignmentId(matchingAssignments[0].id)
    }
  }, [matchingAssignments, assignmentId])

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectAll() {
    setSelectedKeys(new Set(topics.map((t) => t.topicKey)))
  }

  async function handleGenerate() {
    if (!selectedSchemeId) {
      toast.error('Select a scheme')
      return
    }
    if (selectedKeys.size === 0) {
      toast.error('Select at least one topic')
      return
    }
    setGenerating(true)
    setPaper(null)
    try {
      const res = await fetch('/api/teaching/scheme-test/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemeId: selectedSchemeId,
          slot,
          selectedTopicKeys: Array.from(selectedKeys),
          questionCount,
          difficulty,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || 'Generation failed')
        return
      }
      setPaper(json)
      toast.success(
        `Generated ${json.questionCountReturned} validated question(s)` +
          (json.rejectedCount ? ` (${json.rejectedCount} rejected by ECZ gate)` : '')
      )
    } catch {
      toast.error('Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handlePromote() {
    if (!paper?.questions?.length) return
    if (!selectedAssignment?.subjectId) {
      toast.error('Select a class/subject assignment before promoting')
      return
    }
    setPromoting(true)
    try {
      const termNum = Number(String(paper.term || '').replace(/\D/g, '')) || 1
      const res = await fetch('/api/assessments/promote-term-test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot,
          schemeId: paper.schemeId,
          subjectId: selectedAssignment.subjectId,
          classId: selectedAssignment.classId,
          title:
            slot === 'end_of_term'
              ? `${paper.subject} End of Term Test`
              : `${paper.subject} Mid-term Assessment`,
          term: termNum,
          formLevel: Number(String(paper.gradeOrForm || '').replace(/\D/g, '')) || 2,
          questions: paper.questions,
          generatedByAI: true,
          academicYear: String(paper.year || new Date().getFullYear()),
          context: [
            paper.questions?.[0]?.zambianScenario || paper.questions?.[0]?.question || '',
            (paper.selectedTopics || []).map((t: any) => `W${t.week}: ${t.topicTitle}`).join('; '),
          ]
            .filter(Boolean)
            .join('\n'),
          topicKeys: (paper.selectedTopics || []).map((t: any) => t.topicKey),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || 'Promote failed')
        return
      }
      toast.success(json.message || 'Promoted to assessment')
    } catch {
      toast.error('Promote failed')
    } finally {
      setPromoting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Scheme midterm / end-of-term tests
          </CardTitle>
          <CardDescription>
            Select topics taught before the midterm or end-of-term week. Questions are grounded in
            your scheme of work and must pass ECZ validation before they appear.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1">
              <Label>Scheme</Label>
              <Select value={selectedSchemeId || undefined} onValueChange={onSchemeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {schemes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.subject} · {s.gradeOrForm} · {s.term} {s.year}
                      {s.status === 'DRAFT' ? ' (draft)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px] space-y-1">
              <Label>Test slot</Label>
              <Select value={slot} onValueChange={(v) => setSlot(v as Slot)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mid_term">Mid-term</SelectItem>
                  <SelectItem value="end_of_term">End of term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[220px] flex-1 space-y-1">
              <Label>Class / subject (for promote)</Label>
              <Select
                value={selectedAssignment?.id || undefined}
                onValueChange={setAssignmentId}
                disabled={!matchingAssignments.length}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      matchingAssignments.length ? 'Select assignment' : 'No teaching assignments'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {matchingAssignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.subjectName || a.subject?.name || 'Subject'} ·{' '}
                      {a.className || a.class?.name || 'Class'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1">
              <Label>Questions</Label>
              <input
                type="number"
                min={1}
                max={30}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value) || 10)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-[120px] space-y-1">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={() => onRefreshSchemes?.()}>
              Refresh
            </Button>
          </div>

          {draftWarning ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              {draftWarning}
            </p>
          ) : null}
          {warning ? (
            <p className="text-sm text-muted-foreground">{warning}</p>
          ) : cutoffWeek != null ? (
            <p className="text-sm text-muted-foreground">
              Teaching topics before week {cutoffWeek}
              {selectedScheme ? ` · ${selectedScheme.subject}` : ''}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={!topics.length}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedKeys(new Set())}
              disabled={!selectedKeys.size}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !selectedKeys.size}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate validated paper
            </Button>
          </div>

          {loadingTopics ? (
            <p className="text-sm text-muted-foreground">Loading topics…</p>
          ) : (
            <ul className="max-h-64 overflow-auto space-y-2 rounded-md border p-3">
              {topics.length === 0 ? (
                <li className="text-sm text-muted-foreground">No eligible topics for this slot.</li>
              ) : (
                topics.map((t) => {
                  const checked = selectedKeys.has(t.topicKey)
                  return (
                    <li key={`${t.week}-${t.topicKey}`}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50',
                          checked && 'bg-muted/60'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleKey(t.topicKey)}
                        />
                        <span>
                          <span className="font-medium text-sm">
                            Week {t.week}: {t.topicTitle || t.topic}
                          </span>
                          {t.learningOutcomes?.length ? (
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {t.learningOutcomes.slice(0, 2).join(' · ')}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {paper?.questions?.length ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Validated paper</CardTitle>
              <CardDescription>
                {paper.questionCountReturned} question(s) · {paper.rejectedCount || 0} rejected by
                ECZ gate · mode {paper.assessmentMode}
              </CardDescription>
            </div>
            <Button type="button" onClick={handlePromote} disabled={promoting}>
              {promoting
                ? 'Promoting…'
                : slot === 'end_of_term'
                  ? 'Promote to EoT'
                  : 'Promote to midterm'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {paper.questions.map((q: any, idx: number) => (
              <div key={q.id || idx} className="rounded-md border p-3 text-sm space-y-1">
                <div className="font-semibold">
                  Q{idx + 1}
                  {q.topic ? ` · ${q.topic}` : ''}
                  {q.marks != null ? ` (${q.marks} marks)` : ''}
                </div>
                <p>{q.zambianScenario || q.question}</p>
                {Array.isArray(q.subQuestions) && q.subQuestions.length ? (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {q.subQuestions.map((sq: any, i: number) => (
                      <li key={i}>
                        {sq.number || `(${String.fromCharCode(97 + i)})`} {sq.question}{' '}
                        {sq.marks != null ? `[${sq.marks}]` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {Array.isArray(q.options) && q.options.length ? (
                  <ul className="list-disc pl-5">
                    {q.options.map((o: string, i: number) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
