'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Button } from '@/components/ui/Button'
import HodTeacherCoveragePanel from '@/components/chat/HodTeacherCoveragePanel'
import { ArrowLeft, CheckCircle, XCircle, Download, Loader2 } from 'lucide-react'

export default function HodChatLessonPlansPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat/lesson-plans/pending', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to load')
      setRows(Array.isArray(data.submissions) ? data.submissions : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const review = async (id, action) => {
    let comments = null
    if (action === 'reject') {
      comments = window.prompt('Rejection reason (required):') || ''
      if (!comments.trim()) return
    }
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/chat/lesson-plans/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, comments }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.message || 'Review failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const download = async (id) => {
    setError(null)
    try {
      const res = await fetch(`/api/chat/lesson-plans/${id}/download`, { credentials: 'include' })
      const ct = res.headers.get('content-type') || ''
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Download failed')
      }
      if (ct.includes('application/json')) {
        const data = await res.json()
        if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lesson-plan-${id}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <DashboardLayout title="Chat Lesson Plans (Approval)">
      <div className="space-y-4 max-w-3xl">
        <Link href="/dashboard/hod">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <p className="text-sm text-muted">
          Pending .docx lesson plans generated from teacher chat. Approve or reject here (Phase 3).
          Coverage drilldown is department-scoped (Phase 4).
        </p>

        <HodTeacherCoveragePanel />

        {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No pending chat lesson-plan submissions.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="border border-ink/10 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
              >
                <div>
                  <div className="font-medium text-sm">
                    {r.subject} • {r.grade} • {r.topic}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {r.teacher?.name || 'Teacher'}
                    {r.submittedAt ? ` · ${new Date(r.submittedAt).toLocaleString()}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void download(r.id)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => void review(r.id, 'approve')}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => void review(r.id, 'reject')}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
