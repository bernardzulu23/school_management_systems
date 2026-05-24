'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LessonPlanViewer from '@/components/lesson-plans/LessonPlanViewer'
import toast from 'react-hot-toast'
import { ArrowLeft, FileText, Send } from 'lucide-react'

function fmtDate(v) {
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString()
  } catch {
    return ''
  }
}

function statusLabel(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'DRAFT') return 'Draft'
  if (s === 'SUBMITTED') return 'Pending HOD approval'
  if (s === 'APPROVED') return 'Approved by HOD'
  if (s === 'REJECTED') return 'Rejected'
  if (s === 'REVISION_REQUESTED') return 'Revisions requested'
  return s
}

const EDITABLE = new Set(['DRAFT', 'REJECTED', 'REVISION_REQUESTED'])

export default function TeacherLessonPlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id || '')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState(null)
  const [content, setContent] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/lesson-plans/${encodeURIComponent(id)}`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) {
          setPlan(null)
          return
        }
        setPlan(json.data)
        setContent(json.data?.content || '')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const metaLines = useMemo(() => {
    if (!plan) return []
    const reviewer = plan?.reviewer?.name || plan?.reviewer?.email
    return [
      `Subject: ${plan.subject}`,
      `Grade/Form: ${plan.grade}`,
      `Topic: ${plan.topic}`,
      plan.subTopic ? `Sub-topic: ${plan.subTopic}` : '',
      plan.term ? `Term: ${plan.term}` : '',
      plan.duration ? `Duration: ${plan.duration} min` : '',
      `Status: ${statusLabel(plan.status)}`,
      reviewer ? `Reviewer: ${reviewer}` : '',
      plan.submittedAt ? `Submitted: ${fmtDate(plan.submittedAt)}` : '',
      plan.approvedAt ? `Approved: ${fmtDate(plan.approvedAt)}` : '',
    ].filter(Boolean)
  }, [plan])

  const canEdit = plan && EDITABLE.has(String(plan.status || '').toUpperCase())
  const canSubmit = canEdit

  const saveContent = async () => {
    if (!plan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/lesson-plans/${encodeURIComponent(plan.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.message || 'Failed to save')
        return
      }
      setPlan((p) => ({ ...p, ...json.data }))
      toast.success('Saved')
    } finally {
      setSaving(false)
    }
  }

  const submit = async () => {
    if (!plan) return
    setSaving(true)
    try {
      if (canEdit && content !== plan.content) {
        await fetch(`/api/lesson-plans/${encodeURIComponent(plan.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content }),
        })
      }
      const res = await fetch(`/api/lesson-plans/${encodeURIComponent(plan.id)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.message || 'Failed to submit')
        return
      }
      setPlan(json.data)
      toast.success(json.message || 'Submitted for HOD approval')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Lesson Plan">
      <div className="space-y-4">
        <Link href="/dashboard/teacher/lesson-plans">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            My lesson plans
          </Button>
        </Link>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
              {plan ? `${plan.subject} • ${plan.grade}` : 'Lesson Plan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-royalPurple-text2">Loading…</div>
            ) : !plan ? (
              <div className="text-royalPurple-text2">Not found.</div>
            ) : (
              <LessonPlanViewer
                planId={plan.id}
                subject={plan.subject}
                form={plan.grade}
                topic={plan.topic}
                status={plan.status}
                approvalStatus={plan.status}
                approvalNotes={plan.approvalNotes}
                lessonContent={plan.content}
                metaLines={metaLines}
                editable={canEdit}
                contentValue={content}
                onContentChange={setContent}
                actions={
                  canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={saveContent} disabled={saving}>
                        Save changes
                      </Button>
                      {canSubmit ? (
                        <Button onClick={submit} disabled={saving}>
                          <Send className="h-4 w-4 mr-2" />
                          {String(plan.status) === 'DRAFT' ? 'Submit to HOD' : 'Resubmit to HOD'}
                        </Button>
                      ) : null}
                    </div>
                  ) : null
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
