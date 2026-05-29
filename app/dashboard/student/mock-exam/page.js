'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Clock, FileCheck, Trophy } from 'lucide-react'
import Link from 'next/link'
import { FeatureGate } from '@/components/FeatureGate'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ECZ_PRACTICE_EXAM_LEVEL_GROUPS } from '@/lib/ecz/ecz-practice-levels'
import { api } from '@/lib/api'

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function StudentMockExamPage() {
  const [form, setForm] = useState({
    subject: 'Mathematics',
    examLevel: 'grade9',
    topic: '',
  })
  const [attempt, setAttempt] = useState(null)
  const [paper, setPaper] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [percentile, setPercentile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deadline, setDeadline] = useState(null)
  const [now, setNow] = useState(Date.now())

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.getMockExamHistory()
      setHistory(res?.data || [])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || !deadline) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [attempt, deadline])

  const timeLeftMs = useMemo(() => {
    if (!deadline) return null
    return deadline - now
  }, [deadline, now])

  const timedOut = timeLeftMs != null && timeLeftMs <= 0

  async function startExam() {
    if (!form.subject.trim() || !form.topic.trim()) {
      setError('Subject and topic are required')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setPercentile(null)
    try {
      const res = await api.startMockExam({
        subject: form.subject.trim(),
        topic: form.topic.trim(),
        examLevel: form.examLevel,
        questionCount: 8,
        durationMinutes: 120,
      })
      const data = res?.data
      setAttempt(data)
      setPaper(data?.paper)
      setAnswers({})
      const mins = data?.durationMinutes || 120
      setDeadline(Date.now() + mins * 60 * 1000)
    } catch (e) {
      setError(e?.message || 'Could not start mock exam')
    } finally {
      setLoading(false)
    }
  }

  async function submitExam(forced = false) {
    if (!attempt?.id) return
    if (!forced && timedOut === false) {
      const empty = (paper?.questions || []).filter((q) => !String(answers[q.id] || '').trim())
      if (empty.length === (paper?.questions || []).length) {
        setError('Answer at least one question before submitting')
        return
      }
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.submitMockExam(attempt.id, { answers })
      const data = res?.data
      setResult(data)
      setAttempt(data)
      setPaper(data?.paper)
      setDeadline(null)

      try {
        const pct = await api.getNationalPercentile({
          subject: data.subject,
          examLevel: data.examLevel,
          attemptId: data.id,
        })
        setPercentile(pct?.data)
      } catch {
        /* percentile is best-effort */
      }
      loadHistory()
    } catch (e) {
      setError(e?.message || 'Submit failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (timedOut && attempt?.status === 'in_progress' && !loading) {
      submitExam(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut])

  function resetFlow() {
    setAttempt(null)
    setPaper(null)
    setAnswers({})
    setResult(null)
    setPercentile(null)
    setDeadline(null)
    setError(null)
  }

  const questions = paper?.questions || []

  return (
    <DashboardLayout title="Mock Examination">
      <div className="space-y-4">
        <Link href="/dashboard/student">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <FeatureGate featureId="ecz-practice">
          {!attempt ? (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  ECZ Mock Examination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-royalPurple-text2">
                  Timed ECZ-style exam (2 hours). Structured answers are auto-scored; extended
                  responses may be flagged for teacher review.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Level</Label>
                    <select
                      className="w-full zsms-select"
                      value={form.examLevel}
                      onChange={(e) => setForm((p) => ({ ...p, examLevel: e.target.value }))}
                    >
                      {ECZ_PRACTICE_EXAM_LEVEL_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.levels.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Topic</Label>
                    <Input
                      value={form.topic}
                      onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                      placeholder="e.g. Algebra and equations"
                    />
                  </div>
                </div>
                {error ? <UpgradePrompt error={error} /> : null}
                <Button onClick={startExam} disabled={loading}>
                  {loading ? 'Generating exam…' : 'Start mock exam'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-royalPurple-text1 flex items-center justify-between gap-2">
                    <span>
                      {paper?.examInfo?.subject || attempt.subject} • {attempt.topic}
                    </span>
                    {attempt.status === 'in_progress' && timeLeftMs != null ? (
                      <span className="flex items-center gap-1 text-sm font-normal">
                        <Clock className="h-4 w-4" />
                        {formatDuration(timeLeftMs)}
                      </span>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {paper?.examInfo ? (
                    <p className="text-sm text-royalPurple-text2">
                      Total marks: {paper.examInfo.totalMarks} • Time allowed:{' '}
                      {paper.examInfo.timeAllowed}
                    </p>
                  ) : null}

                  {questions.map((q, idx) => (
                    <div key={q.id} className="border border-royalPurple-border rounded-lg p-4">
                      <p className="font-medium text-royalPurple-text1">
                        {idx + 1}. {q.question}{' '}
                        <span className="text-royalPurple-text2">({q.marks} marks)</span>
                      </p>
                      {q.options?.length ? (
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, i) => (
                            <label key={i} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                disabled={attempt.status !== 'in_progress'}
                                checked={answers[q.id] === opt}
                                onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                              />
                              {String.fromCharCode(65 + i)}. {opt}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          className="mt-2 w-full zsms-input min-h-[80px] p-3 rounded-md border"
                          rows={3}
                          disabled={attempt.status !== 'in_progress'}
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          placeholder="Your answer"
                        />
                      )}
                      {result?.scoring?.breakdown?.find((b) => b.questionId === q.id) ? (
                        <div className="mt-2 text-sm bg-royalPurple-bg2 p-2 rounded">
                          <p>
                            Score:{' '}
                            {result.scoring.breakdown.find((b) => b.questionId === q.id)?.awarded}/
                            {q.marks}
                            {result.scoring.breakdown.find((b) => b.questionId === q.id)
                              ?.needsReview
                              ? ' — pending teacher review'
                              : ''}
                          </p>
                          {q.answer && attempt.status !== 'in_progress' ? (
                            <p className="text-royalPurple-text2 mt-1">Model answer: {q.answer}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}

                  {error ? <UpgradePrompt error={error} /> : null}

                  {attempt.status === 'in_progress' ? (
                    <Button onClick={() => submitExam(false)} disabled={loading}>
                      {loading ? 'Submitting…' : 'Submit exam'}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-royalPurple-bg2">
                        <p className="text-lg font-semibold">
                          Score: {result?.scoring?.awardedMarks ?? attempt.awardedMarks} /{' '}
                          {result?.scoring?.totalMarks ?? attempt.totalMarks} (
                          {result?.scoring?.percentage ?? attempt.percentage}%)
                        </p>
                        {result?.scoring?.needsReview || attempt.needsReview ? (
                          <p className="text-sm text-amber-700 mt-1">
                            Some answers need teacher review before final grading.
                          </p>
                        ) : null}
                      </div>
                      {percentile ? (
                        <div className="p-4 rounded-lg border flex items-start gap-2">
                          <Trophy className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">{percentile.message}</p>
                            {percentile.percentile != null ? (
                              <p className="text-sm text-royalPurple-text2">
                                National percentile: {percentile.percentile}% (sample:{' '}
                                {percentile.sampleSize} exams)
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <Button variant="outline" onClick={resetFlow}>
                        Start another mock exam
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {history.length > 0 ? (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1">Recent attempts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.slice(0, 8).map((h) => (
                  <div
                    key={h.id}
                    className="flex justify-between text-sm border-b border-royalPurple-border pb-2"
                  >
                    <span>
                      {h.subject} • {h.topic} ({h.examLevel})
                    </span>
                    <span>{h.status === 'in_progress' ? 'In progress' : `${h.percentage}%`}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
