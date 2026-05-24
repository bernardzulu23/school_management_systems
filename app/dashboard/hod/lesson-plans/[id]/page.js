'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Download, FileText, Printer, XCircle } from 'lucide-react'

function fmtDate(v) {
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString()
  } catch {
    return ''
  }
}

function renderPdf({ title, metaLines, content }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const maxWidth = pageWidth - margin * 2

  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.text(title, margin, margin)

  let y = margin + 18
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  for (const line of metaLines) {
    const wrapped = doc.splitTextToSize(String(line || ''), maxWidth)
    for (const w of wrapped) {
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(w, margin, y)
      y += 14
    }
  }

  y += 10
  doc.setFontSize(11)
  const lines = doc.splitTextToSize(String(content || ''), maxWidth)
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += 14
  }

  return doc
}

export default function HodLessonPlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const id = String(params?.id || '')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState(null)
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
    const teacher = plan?.createdBy?.name || plan?.createdBy?.email || 'Teacher'
    const reviewer = plan?.reviewer?.name || plan?.reviewer?.email || 'Reviewer'
    return [
      `Teacher: ${teacher}`,
      `Reviewer: ${reviewer}`,
      `Subject: ${plan.subject}`,
      `Grade/Form: ${plan.grade}`,
      `Topic: ${plan.topic}`,
      `Status: ${String(plan.status || '').toUpperCase()}`,
      plan.submittedAt ? `Submitted: ${fmtDate(plan.submittedAt)}` : '',
    ].filter(Boolean)
  }, [plan])

  const downloadPdf = () => {
    if (!plan) return
    const title = `${plan.subject} Lesson Plan`
    const doc = renderPdf({ title, metaLines, content: plan.content })
    const filename = `lesson-plan_${String(plan.grade || '').replaceAll(' ', '-')}_${String(plan.subject || '').replaceAll(' ', '-')}.pdf`
    doc.save(filename)
  }

  const approve = async () => {
    if (!plan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/lesson-plans/${encodeURIComponent(plan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'approve' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.message || 'Failed to approve')
        return
      }
      setPlan((p) => ({ ...(p || {}), ...json.data }))
      toast.success('Approved')
    } finally {
      setSaving(false)
    }
  }

  const requestRevision = async () => {
    if (!plan) return
    if (!String(rejectReason || '').trim()) {
      toast.error('Enter what needs to be revised')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/lesson-plans/${encodeURIComponent(plan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'request_revision', reason: rejectReason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.message || 'Failed to request revisions')
        return
      }
      setPlan((p) => ({ ...(p || {}), ...json.data }))
      toast.success('Sent back for revision')
    } finally {
      setSaving(false)
    }
  }

  const reject = async () => {
    if (!plan) return
    if (!String(rejectReason || '').trim()) {
      toast.error('Enter a reason for rejecting')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/lesson-plans/${encodeURIComponent(plan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reject', reason: rejectReason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.message || 'Failed to reject')
        return
      }
      setPlan((p) => ({ ...(p || {}), ...json.data }))
      toast.success('Rejected')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Lesson Plan Review">
      <div className="space-y-4">
        <Link href="/dashboard/hod/lesson-plans">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lesson Plans
          </Button>
        </Link>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
                {plan ? `${plan.subject} • ${plan.grade}` : 'Lesson Plan'}
              </span>
              <div className="flex items-center gap-2 print:hidden">
                <Button variant="outline" onClick={() => window.print()} disabled={!plan}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={downloadPdf} disabled={!plan}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-royalPurple-text2">Loading…</div>
            ) : !plan ? (
              <div className="text-royalPurple-text2">Not found.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
                    <div className="text-sm text-royalPurple-text3">Teacher</div>
                    <div className="text-royalPurple-text1 font-semibold">
                      {plan?.createdBy?.name || plan?.createdBy?.email || 'Teacher'}
                    </div>
                    <div className="mt-3 text-sm text-royalPurple-text3">Topic</div>
                    <div className="text-royalPurple-text2">{plan.topic}</div>
                  </div>
                  <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
                    <div className="text-sm text-royalPurple-text3">Status</div>
                    <div className="text-royalPurple-text1 font-semibold">
                      {String(plan.status || '').toUpperCase()}
                    </div>
                    {plan.approvalNotes ? (
                      <>
                        <div className="mt-3 text-sm text-royalPurple-text3">Approval notes</div>
                        <div className="text-royalPurple-text2">{plan.approvalNotes}</div>
                      </>
                    ) : null}
                    {plan.rejectionReason ? (
                      <>
                        <div className="mt-3 text-sm text-royalPurple-text3">
                          {String(plan.status) === 'REVISION_REQUESTED'
                            ? 'Revisions requested'
                            : 'Rejection reason'}
                        </div>
                        <div className="text-royalPurple-text2">{plan.rejectionReason}</div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
                  <div className="text-sm text-royalPurple-text3 mb-2">Lesson plan</div>
                  <div className="whitespace-pre-wrap text-sm text-royalPurple-text2 leading-relaxed">
                    {plan.content}
                  </div>
                </div>

                {String(plan.status || '').toUpperCase() === 'SUBMITTED' ? (
                  <div className="space-y-3 print:hidden">
                    <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
                      <div className="text-sm text-royalPurple-text3 mb-2">
                        Approval notes (optional)
                      </div>
                      <textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="w-full min-h-[70px] p-3 rounded-lg bg-transparent border border-royalPurple-border text-royalPurple-text1 text-sm mb-4"
                        placeholder="Well done — good use of Zambian contexts…"
                      />
                      <div className="text-sm text-royalPurple-text3 mb-2">
                        Feedback / rejection / revision reason
                      </div>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full min-h-[90px] p-3 rounded-lg bg-transparent border border-royalPurple-border text-royalPurple-text1 text-sm"
                        placeholder="Explain what needs to be corrected…"
                      />
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button onClick={approve} disabled={saving}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button variant="outline" onClick={requestRevision} disabled={saving}>
                          Request revision
                        </Button>
                        <Button variant="outline" onClick={reject} disabled={saving}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
