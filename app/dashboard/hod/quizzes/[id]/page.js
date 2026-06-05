'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'

export default function HodQuizReviewPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const id = String(params?.id || '')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvalNotes, setApprovalNotes] = useState('')

  useEffect(() => {
    const role = String(user?.role || '').toLowerCase()
    const allowed =
      role === 'hod' || role === 'headteacher' || role === 'admin' || Boolean(user?.hodProfile)
    if (user && !allowed) router.replace(`/dashboard/${role || 'teacher'}`)
  }, [user, router])

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/assessments/${encodeURIComponent(id)}/questions`, {
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setMeta(null)
          return
        }
        setMeta(json.data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const review = async (action) => {
    if (!meta) return
    if ((action === 'reject' || action === 'request_revision') && !rejectReason.trim()) {
      toast.error('Enter a reason')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(id)}/review`, {
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
      if (!res.ok) {
        toast.error(json?.error || 'Review failed')
        return
      }
      setMeta((m) => ({ ...m, ...json.data }))
      toast.success(
        action === 'approve' ? 'Approved and sent to students' : 'Feedback sent to teacher'
      )
    } finally {
      setSaving(false)
    }
  }

  const canReview = String(meta?.status || '').toUpperCase() === 'SUBMITTED'

  if (loading) {
    return (
      <DashboardLayout title="Review quiz">
        <p className="text-royalPurple-text2">Loading…</p>
      </DashboardLayout>
    )
  }

  if (!meta) {
    return (
      <DashboardLayout title="Review quiz">
        <p className="text-royalPurple-dangerTx">Quiz not found</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Review quiz">
      <div className="space-y-4">
        <Link href="/dashboard/hod/quizzes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to queue
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{meta.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-royalPurple-text2 space-y-1">
            <div>
              {meta.subject} · {meta.class} · Status: {meta.status}
            </div>
            <div className="text-royalPurple-text1">
              Full preview with answers (students will not see answers until after submit).
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(meta.questions || []).map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 rounded-lg border border-royalPurple-border space-y-2"
              >
                <p className="font-semibold text-royalPurple-text1">
                  Q{idx + 1}. {q.question}
                </p>
                {Array.isArray(q.options) && q.options.length > 0 ? (
                  <ul className="list-disc ml-5 text-sm text-royalPurple-text2">
                    {q.options.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-sm text-royalPurple-successTx">Answer: {q.answer}</p>
                {q.explanation ? (
                  <p className="text-xs text-royalPurple-text2">{q.explanation}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        {canReview ? (
          <Card>
            <CardHeader>
              <CardTitle>HOD decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full min-h-[80px] rounded border border-royalPurple-border p-2 text-sm"
                placeholder="Approval notes (optional)"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
              <textarea
                className="w-full min-h-[80px] rounded border border-royalPurple-border p-2 text-sm"
                placeholder="Reason if rejecting or requesting revision"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => review('approve')} disabled={saving}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & send to students
                </Button>
                <Button
                  variant="outline"
                  onClick={() => review('request_revision')}
                  disabled={saving}
                >
                  Request revision
                </Button>
                <Button variant="outline" onClick={() => review('reject')} disabled={saving}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
