'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, FileText, Printer, Send } from 'lucide-react'

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
  const canPdf = plan && String(plan.status).toUpperCase() === 'APPROVED'

  const downloadPdf = () => {
    if (!plan) return
    const title = `${plan.subject} Lesson Plan`
    const doc = renderPdf({ title, metaLines, content: plan.content })
    const filename = `lesson-plan_${String(plan.grade || '').replaceAll(' ', '-')}_${String(plan.subject || '').replaceAll(' ', '-')}.pdf`
    doc.save(filename)
  }

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
            <CardTitle className="text-royalPurple-text1 flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-royalPurple-accentTx" />
                {plan ? `${plan.subject} • ${plan.grade}` : 'Lesson Plan'}
              </span>
              <div className="flex items-center gap-2 print:hidden">
                {canPdf ? (
                  <Button variant="outline" onClick={downloadPdf}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => window.print()} disabled={!plan}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
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
                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
                  <div className="text-sm text-royalPurple-text3">Status</div>
                  <div className="text-royalPurple-text1 font-semibold">
                    {statusLabel(plan.status)}
                  </div>
                  {plan.approvalNotes ? (
                    <>
                      <div className="mt-3 text-sm text-royalPurple-text3">HOD notes</div>
                      <div className="text-royalPurple-text2">{plan.approvalNotes}</div>
                    </>
                  ) : null}
                  {plan.rejectionReason ? (
                    <>
                      <div className="mt-3 text-sm text-royalPurple-text3">
                        {String(plan.status) === 'REVISION_REQUESTED'
                          ? 'Revisions needed'
                          : 'Rejection reason'}
                      </div>
                      <div className="text-royalPurple-text2">{plan.rejectionReason}</div>
                    </>
                  ) : null}
                </div>

                <div className="backdrop-blur-sm bg-royalPurple-card/60 border border-royalPurple-border/40 rounded-2xl p-4">
                  <div className="text-sm text-royalPurple-text3 mb-2">Lesson plan</div>
                  {canEdit ? (
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full min-h-[320px] p-3 rounded-lg bg-transparent border border-royalPurple-border text-royalPurple-text1 text-sm font-mono leading-relaxed"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm text-royalPurple-text2 leading-relaxed">
                      {plan.content}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 print:hidden">
                  {canEdit ? (
                    <>
                      <Button variant="outline" onClick={saveContent} disabled={saving}>
                        Save changes
                      </Button>
                      {canSubmit ? (
                        <Button onClick={submit} disabled={saving}>
                          <Send className="h-4 w-4 mr-2" />
                          {String(plan.status) === 'DRAFT' ? 'Submit to HOD' : 'Resubmit to HOD'}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
