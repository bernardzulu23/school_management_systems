'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardList } from 'lucide-react'
import { FeatureGate } from '@/components/FeatureGate'
import { RagReferencesPanel } from '@/components/ai/RagReferencesPanel'
import { useAIFetch } from '@/hooks/useAIStream'
import UpgradePrompt from '@/components/shared/UpgradePrompt'
import { toast } from 'react-hot-toast'

const STEPS = ['Class & subject', 'Topic & materials', 'Generate & assign']

export default function TopicTestPage() {
  const [step, setStep] = useState(0)
  const [teachingAssignments, setTeachingAssignments] = useState([])
  const [targetAssignmentId, setTargetAssignmentId] = useState('')
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState('medium')
  const [materials, setMaterials] = useState([])
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([])
  const [previewRefs, setPreviewRefs] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const { data, loading, error, fetch: fetchQuiz } = useAIFetch('/api/ai/quiz-maker')
  const quiz = data?.quiz || null
  const ragReferences = Array.isArray(data?.ragReferences) ? data.ragReferences : []

  const selectedAssignment =
    teachingAssignments.find((a) => a.id === targetAssignmentId) || teachingAssignments[0] || null

  const grade = useMemo(() => {
    const name = String(selectedAssignment?.className || '')
    const m = name.match(/Form\s*(\d)/i)
    return m ? `Form ${m[1]}` : 'Form 2'
  }, [selectedAssignment?.className])

  const subject = selectedAssignment?.subjectName || ''

  useEffect(() => {
    fetch('/api/teaching-assignments', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const items = Array.isArray(json?.data) ? json.data : []
        setTeachingAssignments(items)
        if (items[0]) setTargetAssignmentId(items[0].id)
      })
      .catch(() => setTeachingAssignments([]))
  }, [])

  useEffect(() => {
    if (!subject) {
      setMaterials([])
      return
    }
    fetch(`/api/materials?subject=${encodeURIComponent(subject)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const items = Array.isArray(json?.data) ? json.data : []
        setMaterials(items.filter((m) => (m.chunksIndexed || 0) > 0))
      })
      .catch(() => setMaterials([]))
  }, [subject])

  const toggleMaterial = (id) => {
    setSelectedMaterialIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) {
        toast.error('Select at most 3 materials for a topic test')
        return prev
      }
      return [...prev, id]
    })
  }

  const handlePreview = async () => {
    if (topic.trim().length < 3) {
      toast.error('Enter a topic (min 3 characters)')
      return
    }
    setPreviewLoading(true)
    try {
      const params = new URLSearchParams({
        subject,
        topic: topic.trim(),
        gradeLevel: grade,
      })
      if (selectedMaterialIds.length) params.set('materialIds', selectedMaterialIds.join(','))
      const res = await fetch(`/api/materials/rag-preview?${params}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Preview failed')
      setPreviewRefs(Array.isArray(json?.refs) ? json.refs : [])
      toast.success(
        json.hasCoverage ? `${json.chunkCount} excerpt(s) matched` : 'No chunks matched yet'
      )
    } catch (e) {
      toast.error(e.message || 'Preview failed')
      setPreviewRefs([])
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleGenerate = () => {
    if (!selectedAssignment || topic.trim().length < 3) return
    fetchQuiz({
      grade,
      subject,
      topic: topic.trim(),
      questionCount,
      difficulty,
      materialIds: selectedMaterialIds.length ? selectedMaterialIds : undefined,
    })
    setStep(2)
  }

  const buildAiAnalysis = () => {
    const titles = materials.filter((m) => selectedMaterialIds.includes(m.id)).map((m) => m.title)
    return {
      topic: topic.trim(),
      materialIds: selectedMaterialIds.length ? selectedMaterialIds : data?.materialIds || [],
      ragReferences: ragReferences.length ? ragReferences : previewRefs,
      sourceMaterialTitles: titles.length ? titles : undefined,
    }
  }

  const handleSubmitToHod = async () => {
    if (!quiz || !selectedAssignment) return
    setPublishing(true)
    try {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const createRes = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: quiz.title || `${subject} — ${topic} Topic Test`,
          type: 'quiz',
          subject,
          classId: selectedAssignment.classId,
          class: selectedAssignment.className,
          date: dueDate,
          topic: topic.trim(),
          questions: quiz.questions || [],
          aiAnalysis: buildAiAnalysis(),
        }),
      })
      const created = await createRes.json().catch(() => ({}))
      if (!createRes.ok) throw new Error(created?.error || 'Failed to create assessment')

      const submitRes = await fetch(`/api/assessments/${created.data.id}/submit-hod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const submitted = await submitRes.json().catch(() => ({}))
      if (!submitRes.ok) throw new Error(submitted?.error || 'Failed to submit')
      toast.success('Topic test submitted — students receive it after HOD approval')
    } catch (e) {
      toast.error(e.message || 'Could not assign topic test')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <DashboardLayout title="Topic Test from Materials">
      <div className="space-y-4 max-w-3xl">
        <Link href="/dashboard/teacher">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <FeatureGate featureId="ai-quiz-maker">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-royalPurple-text1">
                <ClipboardList className="h-5 w-5" />
                Topic Test (RAG materials)
              </CardTitle>
              <p className="text-sm text-royalPurple-text3">
                Test student understanding on a topic you covered using your uploaded AI materials.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2 text-xs">
                {STEPS.map((label, i) => (
                  <span
                    key={label}
                    className={`px-2 py-1 rounded-full ${i === step ? 'bg-accent/20 text-accent' : 'bg-royalPurple-card text-royalPurple-text3'}`}
                  >
                    {i + 1}. {label}
                  </span>
                ))}
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label>Teaching assignment</Label>
                    <select
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={targetAssignmentId}
                      onChange={(e) => setTargetAssignmentId(e.target.value)}
                    >
                      {teachingAssignments.length === 0 ? (
                        <option value="">No assignments</option>
                      ) : (
                        teachingAssignments.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.className} — {a.subjectName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <Button disabled={!selectedAssignment} onClick={() => setStep(1)}>
                    Continue
                  </Button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Topic covered *</Label>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Computer hardware components"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      Source materials (pick 1–3)
                    </Label>
                    {materials.length === 0 ? (
                      <p className="text-sm text-amber-700 mt-2">
                        No indexed materials for {subject}.{' '}
                        <Link href="/dashboard/teacher/ai-materials" className="underline">
                          Upload first
                        </Link>
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                        {materials.map((m) => (
                          <label key={m.id} className="flex gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedMaterialIds.includes(m.id)}
                              onChange={() => toggleMaterial(m.id)}
                            />
                            {m.title} ({m.chunksIndexed} chunks)
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Questions</Label>
                      <Input
                        type="number"
                        min={5}
                        max={20}
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <select
                        className="w-full h-10 rounded-md border px-2 text-sm"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
                    {previewLoading ? 'Checking…' : 'Preview source coverage'}
                  </Button>
                  {previewRefs.length > 0 ? <RagReferencesPanel references={previewRefs} /> : null}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(0)}>
                      Back
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={loading || topic.trim().length < 3 || !selectedAssignment}
                    >
                      {loading ? 'Generating…' : 'Generate topic test'}
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {error ? <UpgradePrompt error={error} /> : null}
                  {loading ? (
                    <p className="text-sm text-royalPurple-text2">
                      Generating quiz from your materials…
                    </p>
                  ) : null}
                  {quiz ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-kpi-pass">
                        <CheckCircle2 className="h-4 w-4" />
                        {quiz.questions?.length || 0} questions ready for {subject} — {topic}
                      </div>
                      <RagReferencesPanel references={ragReferences} />
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleSubmitToHod} disabled={publishing}>
                          {publishing ? 'Submitting…' : 'Submit to HOD for class'}
                        </Button>
                        <Link href="/dashboard/teacher/quiz-maker">
                          <Button variant="outline">Open in Quiz Maker</Button>
                        </Link>
                        <Button variant="outline" onClick={() => setStep(1)}>
                          Back
                        </Button>
                      </div>
                    </>
                  ) : !loading && !error ? (
                    <Button onClick={() => setStep(1)}>Back to edit topic</Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </FeatureGate>
      </div>
    </DashboardLayout>
  )
}
