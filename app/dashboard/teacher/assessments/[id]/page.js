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
import { ArrowLeft, Download, Send, Save } from 'lucide-react'

export default function TeacherAssessmentInteractivePage() {
  const params = useParams()
  const assessmentId = params?.id
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState(null)
  const [questions, setQuestions] = useState([])
  const [publishedAssignmentId, setPublishedAssignmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

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

  const publish = async () => {
    setPublishing(true)
    try {
      await saveQuestions()
      const res = await fetch(`/api/assessments/${assessmentId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questions }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Publish failed')
      const newId = json.data?.publishedAssignmentId || ''
      setPublishedAssignmentId(newId)
      toast.success('Published to students')
    } catch (e) {
      toast.error(e.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const submitToHod = async () => {
    if (!publishedAssignmentId) {
      toast.error('Publish to students first')
      return
    }
    try {
      const res = await fetch(`/api/assignments/${publishedAssignmentId}/submit-hod`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Submit failed')
      toast.success('Submitted to HOD')
    } catch (e) {
      toast.error(e.message || 'Submit failed')
    }
  }

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
            <CardTitle>{meta?.title || 'Assessment'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-royalPurple-text2 space-y-1">
            <div>
              {meta?.subject} · {meta?.class}
            </div>
            <div>
              Students see questions without answers until they choose. Auto-graded with
              encouragement feedback.
            </div>
            {publishedAssignmentId ? (
              <div className="text-royalPurple-successTx">
                Published to students — attempts tracked below
              </div>
            ) : (
              <div className="text-warn">Not yet published to students</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InteractiveQuestionBuilder questions={questions} onChange={setQuestions} />
            <div className="flex flex-wrap gap-2 pt-2 border-t border-royalPurple-border">
              <Button onClick={saveQuestions} disabled={saving} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button onClick={publish} disabled={publishing}>
                <Send className="h-4 w-4 mr-2" />
                {publishing ? 'Publishing…' : 'Publish to Students'}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
              <Button variant="outline" onClick={submitToHod} disabled={!publishedAssignmentId}>
                Submit to HOD
              </Button>
            </div>
          </CardContent>
        </Card>

        <PublishedAssessmentAttemptsPanel
          assessmentId={assessmentId}
          publishedAssignmentId={publishedAssignmentId}
        />
      </div>
    </DashboardLayout>
  )
}
