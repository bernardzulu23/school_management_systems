'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { useAIFetch } from '@/hooks/useAIStream'
import { FeatureGate } from '@/components/FeatureGate'
import { RagReferencesPanel } from '@/components/ai/RagReferencesPanel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'

export default function TeacherQuizMakerPage() {
  const { data, loading, error, fetch: fetchQuiz } = useAIFetch('/api/ai/quiz-maker')
  const quiz = data?.quiz || null
  const ragReferences = Array.isArray(data?.ragReferences) ? data.ragReferences : []

  const FORM_LEVELS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']

  const [form, setForm] = useState({
    grade: 'Form 2',
    subject: 'English',
    topic: '',
    questionCount: 10,
    difficulty: 'medium',
  })
  const [teachingAssignments, setTeachingAssignments] = useState([])
  const [targetAssignmentId, setTargetAssignmentId] = useState('')
  const [publishType, setPublishType] = useState('quiz')
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishedAssignmentId, setPublishedAssignmentId] = useState('')
  const [submissionStats, setSubmissionStats] = useState(null)

  const selectedTeachingAssignment =
    teachingAssignments.find((a) => a.id === targetAssignmentId) || teachingAssignments[0] || null

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const res = await fetch('/api/teaching-assignments')
        const json = await res.json().catch(() => ({}))
        const items = Array.isArray(json?.data) ? json.data : []
        setTeachingAssignments(items)
        if (items.length > 0) setTargetAssignmentId(items[0].id)
      } catch {
        setTeachingAssignments([])
      }
    }
    loadAssignments()
  }, [])

  const loadSubmissionStats = async (assignmentId) => {
    if (!assignmentId) return
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load attempts')
      setSubmissionStats(json?.data || null)
    } catch {
      setSubmissionStats(null)
    }
  }

  const handleSaveToQuestionBank = async () => {
    if (!quiz) return
    setSaving(true)
    try {
      const questions = Array.isArray(quiz.questions) ? quiz.questions : []
      const response = await fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quiz.title || `${form.subject} ${form.topic} Quiz`,
          subject: form.subject,
          subjectId: selectedTeachingAssignment?.subjectId || undefined,
          grade: form.grade,
          formLevel: parseInt(String(form.grade || '').replace(/\D/g, ''), 10) || null,
          difficulty: form.difficulty,
          questions,
        }),
      })
      if (!response.ok) throw new Error('Failed to save question bank')
      toast.success('Quiz saved to Question Bank')
    } catch (error) {
      toast.error(error?.message || 'Failed to save quiz')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitToHod = async () => {
    if (!quiz || !selectedTeachingAssignment) {
      toast.error('Select class + subject target first')
      return
    }
    setPublishing(true)
    try {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const createRes = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: quiz.title || `${form.subject} ${form.topic} ${publishType}`,
          type: 'quiz',
          subject: selectedTeachingAssignment.subjectName || form.subject,
          classId: selectedTeachingAssignment.classId,
          class: selectedTeachingAssignment.className,
          date: dueDate,
          topic: form.topic,
          questions: quiz.questions || [],
        }),
      })
      const created = await createRes.json().catch(() => ({}))
      if (!createRes.ok) throw new Error(created?.error || 'Failed to create assessment')

      const assessmentId = created?.data?.id
      const submitRes = await fetch(`/api/assessments/${assessmentId}/submit-hod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic: form.topic }),
      })
      const submitted = await submitRes.json().catch(() => ({}))
      if (!submitRes.ok) throw new Error(submitted?.error || 'Failed to submit to HOD')

      setPublishedAssignmentId(submitted?.data?.publishedAssignmentId || '')
      toast.success('Submitted to HOD — students receive it after approval')
    } catch (error) {
      toast.error(error?.message || 'Failed to submit quiz')
    } finally {
      setPublishing(false)
    }
  }

  const canGenerate = useMemo(
    () => form.topic.trim() && form.subject.trim(),
    [form.topic, form.subject]
  )

  return (
    <DashboardLayout title="AI Quiz Maker">
      <div className="space-y-4">
        <Link href="/dashboard/teacher">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <FeatureGate featureId="ai-quiz-maker">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Quiz Maker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Target class & subject (for publish)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={targetAssignmentId}
                    onChange={(e) => setTargetAssignmentId(e.target.value)}
                  >
                    {teachingAssignments.length === 0 ? (
                      <option value="">No teaching assignments found</option>
                    ) : (
                      teachingAssignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.className} - {a.subjectName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Form level</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.grade}
                    onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                  >
                    {FORM_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Topic</Label>
                  <Input
                    value={form.topic}
                    onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Question Count</Label>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={form.questionCount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, questionCount: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <select
                    className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                    value={form.difficulty}
                    onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Publish as</Label>
                  <select
                    className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                    value={publishType}
                    onChange={(e) => setPublishType(e.target.value)}
                  >
                    <option value="quiz">Quiz</option>
                    <option value="assessment">Assessment</option>
                    <option value="test">Test</option>
                  </select>
                </div>
              </div>

              {error ? <UpgradePrompt error={error} /> : null}

              <Button onClick={() => fetchQuiz(form)} disabled={loading || !canGenerate}>
                {loading ? 'Generating...' : 'Create Quiz'}
              </Button>
            </CardContent>
          </Card>

          {quiz ? (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-royalPurple-text1">{quiz.title || 'Quiz'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-royalPurple-text2">
                  {quiz.grade} • {quiz.subject} • {quiz.topic} • Total marks: {quiz.totalMarks}
                </div>
                <RagReferencesPanel references={ragReferences} />
                <div className="space-y-3">
                  {(quiz.questions || []).map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-xl border border-royalPurple-border bg-royalPurple-card/60"
                    >
                      <div className="text-royalPurple-text1 font-semibold">
                        Q{idx + 1}. {q.question}
                      </div>
                      {Array.isArray(q.options) && q.options.length > 0 ? (
                        <ul className="list-disc ml-5 mt-2 text-royalPurple-text2 text-sm">
                          {q.options.map((o, i) => (
                            <li key={i}>{o}</li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-2 text-sm text-kpi-pass/30">Answer: {q.answer}</div>
                      {q.explanation ? (
                        <div className="mt-1 text-xs text-royalPurple-text3">{q.explanation}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-royalPurple-border">
                  <Button variant="outline" onClick={handleSaveToQuestionBank} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={handleSubmitToHod}
                    disabled={publishing || !selectedTeachingAssignment}
                  >
                    {publishing ? 'Submitting...' : 'Submit to HOD for approval'}
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    Print / Save PDF
                  </Button>
                </div>
                {publishedAssignmentId ? (
                  <div className="text-xs text-royalPurple-text2">
                    Published assignment ID: {publishedAssignmentId}
                  </div>
                ) : null}
                {submissionStats ? (
                  <div className="p-3 rounded-lg border border-royalPurple-border bg-royalPurple-card/60 text-sm">
                    Student Attempts: {submissionStats.totalSubmissions} • Class Average:{' '}
                    {submissionStats.averagePercentage}%
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
