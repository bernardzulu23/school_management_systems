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
  const [materials, setMaterials] = useState([])
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([])
  const [previewRefs, setPreviewRefs] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

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

  const activeSubject = selectedTeachingAssignment?.subjectName || form.subject

  useEffect(() => {
    if (!activeSubject.trim()) {
      setMaterials([])
      return
    }
    fetch(`/api/materials?subject=${encodeURIComponent(activeSubject)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const items = Array.isArray(json?.data) ? json.data : []
        setMaterials(items.filter((m) => (m.chunksIndexed || 0) > 0))
      })
      .catch(() => setMaterials([]))
  }, [activeSubject])

  useEffect(() => {
    if (selectedTeachingAssignment?.subjectName) {
      setForm((p) => ({ ...p, subject: selectedTeachingAssignment.subjectName }))
    }
  }, [selectedTeachingAssignment?.subjectName])

  const toggleMaterial = (id) => {
    setSelectedMaterialIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) {
        toast.error('Select at most 5 materials')
        return prev
      }
      return [...prev, id]
    })
  }

  const handlePreviewSources = async () => {
    if (!form.topic.trim() || form.topic.trim().length < 3) {
      toast.error('Enter a topic (min 3 characters) to preview sources')
      return
    }
    setPreviewLoading(true)
    try {
      const params = new URLSearchParams({
        subject: activeSubject,
        topic: form.topic.trim(),
        gradeLevel: form.grade,
      })
      if (selectedMaterialIds.length) {
        params.set('materialIds', selectedMaterialIds.join(','))
      }
      const res = await fetch(`/api/materials/rag-preview?${params}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Preview failed')
      setPreviewRefs(Array.isArray(json?.refs) ? json.refs : [])
      if (!json?.hasCoverage) {
        toast('No matching chunks found — upload materials or broaden the topic', { icon: '⚠️' })
      } else {
        toast.success(`Found ${json.chunkCount} relevant excerpt(s)`)
      }
    } catch (e) {
      toast.error(e.message || 'Could not preview sources')
      setPreviewRefs([])
    } finally {
      setPreviewLoading(false)
    }
  }

  const buildAiAnalysis = () => {
    const titles = materials.filter((m) => selectedMaterialIds.includes(m.id)).map((m) => m.title)
    return {
      topic: form.topic.trim(),
      materialIds: selectedMaterialIds.length ? selectedMaterialIds : data?.materialIds || [],
      ragReferences: ragReferences.length ? ragReferences : previewRefs,
      sourceMaterialTitles: titles.length ? titles : undefined,
    }
  }

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
          aiAnalysis: buildAiAnalysis(),
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

  const [promotingTermTest, setPromotingTermTest] = useState(false)
  const [termForPromotion, setTermForPromotion] = useState('1')

  const handlePromoteToTermTest = async () => {
    if (!quiz || !selectedTeachingAssignment) {
      toast.error('Generate a quiz and select class/subject first')
      return
    }
    setPromotingTermTest(true)
    try {
      const formLevel = parseInt(String(form.grade || '').replace(/\D/g, ''), 10) || 2
      const res = await fetch('/api/assessments/promote-term-test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedTeachingAssignment.subjectId,
          classId: selectedTeachingAssignment.classId,
          formLevel,
          term: Number(termForPromotion),
          title: `${quiz.title || form.topic} — End of Term Test`,
          context: quiz.questions?.[0]?.question || form.topic,
          questions: quiz.questions || [],
          generatedByAI: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Promotion failed')
      toast.success('Promoted to SBA End of Term Test (40 marks)')
    } catch (e) {
      toast.error(e.message || 'Could not promote quiz')
    } finally {
      setPromotingTermTest(false)
    }
  }

  const canGenerate = useMemo(
    () => form.topic.trim() && form.subject.trim(),
    [form.topic, form.subject]
  )

  const handleCreateQuiz = async () => {
    if (!canGenerate) {
      toast.error('Enter a subject and topic (at least 3 characters)')
      return
    }
    try {
      await fetchQuiz({
        ...form,
        subject: activeSubject,
        materialIds: selectedMaterialIds.length ? selectedMaterialIds : undefined,
      })
    } catch (e) {
      toast.error(e?.message || 'Quiz generation failed')
    }
  }

  useEffect(() => {
    if (!loading && error) {
      toast.error(error?.error || error?.message || 'Quiz generation failed')
    }
  }, [loading, error])

  useEffect(() => {
    if (!loading && data?.success && data?.quiz) {
      const count = Array.isArray(data.quiz.questions) ? data.quiz.questions.length : 0
      if (count === 0) {
        toast.error('AI returned an empty quiz. Try again with a simpler topic.')
      } else {
        toast.success(`Generated ${count} question(s)`)
      }
    }
  }, [loading, data])

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
                <div className="space-y-2 md:col-span-2">
                  <Label>Reference materials (optional, max 5)</Label>
                  {materials.length === 0 ? (
                    <p className="text-sm text-royalPurple-text3">
                      No indexed materials for {activeSubject}.{' '}
                      <Link href="/dashboard/teacher/ai-materials" className="underline">
                        Upload AI materials
                      </Link>
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-royalPurple-border rounded-lg p-3">
                      {materials.map((m) => (
                        <label key={m.id} className="flex items-start gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.includes(m.id)}
                            onChange={() => toggleMaterial(m.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="font-medium text-royalPurple-text1">{m.title}</span>
                            <span className="text-royalPurple-text3">
                              {' '}
                              — {m.chunksIndexed} chunks
                              {m.gradeLevel ? ` · ${m.gradeLevel}` : ''}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewSources}
                    disabled={previewLoading || !form.topic.trim()}
                  >
                    {previewLoading ? 'Previewing…' : 'Preview RAG sources'}
                  </Button>
                  {previewRefs.length > 0 && !ragReferences.length ? (
                    <RagReferencesPanel references={previewRefs} />
                  ) : null}
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

              <Button onClick={handleCreateQuiz} disabled={loading || !canGenerate}>
                {loading ? 'Generating...' : 'Create Quiz'}
              </Button>
            </CardContent>
          </Card>

          {quiz && !(quiz.questions || []).length ? (
            <Card variant="glass">
              <CardContent className="py-8 text-center text-royalPurple-text2">
                Quiz was generated but contained no questions. Click Create Quiz to try again.
              </CardContent>
            </Card>
          ) : null}

          {quiz && (quiz.questions || []).length > 0 ? (
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
                  <select
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={termForPromotion}
                    onChange={(e) => setTermForPromotion(e.target.value)}
                    aria-label="Term for SBA promotion"
                  >
                    <option value="1">Term 1 (20%)</option>
                    <option value="2">Term 2 (30%)</option>
                    <option value="3">Term 3 (50%)</option>
                  </select>
                  <Button
                    variant="secondary"
                    onClick={handlePromoteToTermTest}
                    disabled={promotingTermTest || !selectedTeachingAssignment}
                  >
                    {promotingTermTest ? 'Promoting…' : 'Promote to SBA term test'}
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
