'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { InteractiveQuestionBuilder } from '@/components/assessments/InteractiveQuestionBuilder'
import { PublishedAssessmentAttemptsPanel } from '@/components/assessments/PublishedAssessmentAttemptsPanel'
import { QuizClassAnalysisPanel } from '@/components/assessments/QuizClassAnalysisPanel'
import { ArrowLeft, Download, Send, Save } from 'lucide-react'

function statusPill(status) {
  const s = String(status || 'DRAFT').toUpperCase()
  if (s === 'PUBLISHED') return 'bg-royalPurple-success/20 text-royalPurple-successTx'
  if (s === 'SUBMITTED') return 'bg-royalPurple-accent/20 text-royalPurple-accentTx'
  if (s === 'APPROVED') return 'bg-royalPurple-success/20 text-royalPurple-successTx'
  if (s === 'REJECTED' || s === 'REVISION_REQUESTED')
    return 'bg-royalPurple-danger/20 text-royalPurple-dangerTx'
  return 'bg-royalPurple-card2 text-royalPurple-text2'
}

export default function TeacherAssessmentInteractivePage() {
  const params = useParams()
  const assessmentId = params?.id
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState(null)
  const [questions, setQuestions] = useState([])
  const [publishedAssignmentId, setPublishedAssignmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!assessmentId) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/assessments/${assessmentId}/questions`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to load')
        setMeta(json.data)
        setQuestions(json.data?.questions || [])
        setPublishedAssignmentId(json.data?.publishedAssignmentId || '')
      } catch (e) {
        toast.error(e.message || 'Failed to load assessment')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [assessmentId])

  const saveQuestions = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questions }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success('Questions saved')
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const submitToHod = async () => {
    if (!questions.length) {
      toast.error('Add at least one question')
      return
    }
    setSubmitting(true)
    try {
      await saveQuestions()
      const res = await fetch(`/api/assessments/${assessmentId}/submit-hod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic: meta?.topic || meta?.title }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Submit failed')
      setMeta((m) => ({ ...m, status: 'SUBMITTED', ...(json.data || {}) }))
      toast.success('Submitted to HOD for review')
    } catch (e) {
      toast.error(e.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const canEdit = ['DRAFT', 'REJECTED', 'REVISION_REQUESTED'].includes(
    String(meta?.status || 'DRAFT').toUpperCase()
  )
  const canSubmitHod = canEdit && questions.length > 0
  const isPublished = String(meta?.status || '').toUpperCase() === 'PUBLISHED'

  if (loading) {
    return (
      <DashboardLayout title="Assessment">
        <p className="text-royalPurple-text2">Loading…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Interactive assessment">
      <div className="space-y-4">
        <Link href="/dashboard/teacher/assessments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {meta?.title || 'Assessment'}
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${statusPill(meta?.status)}`}
              >
                {meta?.status || 'DRAFT'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-royalPurple-text2 space-y-1">
            <div>
              {meta?.subject} · {meta?.class}
            </div>
            <div>
              Submit to your HOD first. Once approved, the quiz is sent to students automatically
              (answers hidden; auto-graded).
            </div>
            {meta?.status === 'SUBMITTED' ? (
              <div className="text-royalPurple-accentTx">Awaiting HOD approval</div>
            ) : null}
            {meta?.rejectionReason ? (
              <div className="text-royalPurple-dangerTx">HOD feedback: {meta.rejectionReason}</div>
            ) : null}
            {isPublished ? (
              <div className="text-royalPurple-successTx">
                Published to students — attempts tracked below
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InteractiveQuestionBuilder
              questions={questions}
              onChange={setQuestions}
              readOnly={!canEdit}
            />
            <div className="flex flex-wrap gap-2 pt-2 border-t border-royalPurple-border">
              <Button onClick={saveQuestions} disabled={saving || !canEdit} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button onClick={submitToHod} disabled={submitting || !canSubmitHod}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Submitting…' : 'Submit to HOD'}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <PublishedAssessmentAttemptsPanel
          assessmentId={assessmentId}
          publishedAssignmentId={publishedAssignmentId}
        />

        <QuizClassAnalysisPanel
          assessmentId={assessmentId}
          publishedAssignmentId={publishedAssignmentId}
        />
      </div>
    </DashboardLayout>
  )
}
