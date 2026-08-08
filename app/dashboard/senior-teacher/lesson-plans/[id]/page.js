'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LessonPlanViewer from '@/components/lesson-plans/LessonPlanViewer'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, FileText, XCircle } from 'lucide-react'

function fmtDate(v) {
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString()
  } catch {
    return ''
  }
}

export default function SeniorTeacherLessonPlanDetailPage() {
  const params = useParams()
  const id = String(params?.id || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvalNotes, setApprovalNotes] = useState('')

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
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const metaLines = useMemo(() => {
    if (!plan) return []
    const ctx = plan?.teacherContext
    const teacher = ctx?.teacherName || plan?.createdBy?.name || plan?.createdBy?.email || 'Teacher'
    const reviewer = plan?.reviewer?.name || plan?.reviewer?.email || 'Reviewer'
    return [
      `Teacher: ${teacher}${ctx?.teacherGender ? ` (${ctx.teacherGender})` : ''}`,
      ctx?.schoolName ? `School: ${ctx.schoolName}` : '',
      `Reviewer: ${reviewer}`,
      `Subject: ${plan.subject}`,
      `Grade: ${plan.grade}`,
      `Topic: ${plan.topic}`,
      `Status: ${String(plan.status || '').toUpperCase()}`,
      plan.submittedAt ? `Submitted: ${fmtDate(plan.submittedAt)}` : '',
    ].filter(Boolean)
  }, [plan])

  async function submitReview(action) {
    if (!plan) return
    if ((action === 'reject' || action === 'request_revision') && !String(rejectReason).trim()) {
      toast.error('Enter feedback first')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/lesson-plans/${encodeURIComponent(plan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          reason: rejectReason,
          approvalNotes,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.message || 'Review failed')
        return
      }
      setPlan((current) => ({ ...(current || {}), ...json.data }))
      toast.success(action === 'approve' ? 'Approved' : 'Review sent')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Lesson Plan Review">
      <div className="space-y-4">
        <Link href="/dashboard/senior-teacher/lesson-plans">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lesson Plans
          </Button>
        </Link>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-royalPurple-accent" />
              {plan ? `${plan.subject} • ${plan.grade}` : 'Lesson Plan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-royalPurple-text2">Loading...</div>
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
                actions={
                  String(plan.status || '').toUpperCase() === 'SUBMITTED' ? (
                    <div className="space-y-3">
                      <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
                        <div className="text-sm text-royalPurple-text3 mb-2">
                          Approval notes (optional)
                        </div>
                        <textarea
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          className="w-full min-h-[70px] p-3 rounded-lg bg-transparent border border-royalPurple-border text-royalPurple-text1 text-sm mb-4"
                        />
                        <div className="text-sm text-royalPurple-text3 mb-2">
                          Feedback / rejection / revision reason
                        </div>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full min-h-[90px] p-3 rounded-lg bg-transparent border border-royalPurple-border text-royalPurple-text1 text-sm"
                        />
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button onClick={() => submitReview('approve')} disabled={saving}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => submitReview('request_revision')}
                            disabled={saving}
                          >
                            Request revision
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => submitReview('reject')}
                            disabled={saving}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
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
