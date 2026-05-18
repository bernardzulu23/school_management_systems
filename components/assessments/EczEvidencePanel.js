'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { Archive, AlertTriangle, CheckCircle, Trash2, Upload } from 'lucide-react'
import { EVIDENCE_RETENTION_YEARS } from '@/lib/ecz/ecz-evidence'

function StatusPill({ status }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full">
        <CheckCircle className="h-3 w-3" />
        On file
      </span>
    )
  }
  if (status === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
        <AlertTriangle className="h-3 w-3" />
        Expiring soon
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full">
      <AlertTriangle className="h-3 w-3" />
      May delete
    </span>
  )
}

export function EczEvidencePanel() {
  const { user } = useAuth()
  const role = String(user?.role || '').toLowerCase()
  const canDelete = ['teacher', 'hod', 'headteacher', 'admin'].includes(role)
  const isManager = ['hod', 'headteacher', 'admin'].includes(role)

  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ total: 0, ok: 0, urgent: 0, expired: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [scores, setScores] = useState([])
  const [scoreId, setScoreId] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [formLevel, setFormLevel] = useState('1')

  const loadEvidence = useCallback(async () => {
    setLoading(true)
    try {
      const q = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/ecz/evidence${q}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setRows(json.data || [])
      setSummary(json.summary || { total: 0, ok: 0, urgent: 0, expired: 0 })
    } catch (e) {
      toast.error(e.message || 'Could not load evidence')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const loadScores = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ecz/scores?academicYear=${new Date().getFullYear()}&formLevel=${formLevel}`,
        { credentials: 'include' }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      const list = json.data || []
      setScores(list)
      if (list[0]?.id) setScoreId(list[0].id)
    } catch {
      setScores([])
    }
  }, [formLevel])

  useEffect(() => {
    loadEvidence()
  }, [loadEvidence])

  useEffect(() => {
    if (showUpload) loadScores()
  }, [showUpload, loadScores])

  const upload = async (e) => {
    e.preventDefault()
    if (!scoreId || !file) {
      toast.error('Select a score record and file')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('scoreId', scoreId)
      fd.append('file', file)
      const res = await fetch('/api/ecz/evidence', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      toast.success(json.message)
      setFile(null)
      setShowUpload(false)
      loadEvidence()
    } catch (e) {
      toast.error(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (id) => {
    if (
      !confirm(
        'Delete this evidence file? ECZ requires 2-year retention — only delete after expiry unless HOD approved.'
      )
    ) {
      return
    }
    try {
      const res = await fetch(`/api/ecz/evidence/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      toast.success(json.message || 'Deleted')
      loadEvidence()
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200/50 bg-blue-500/10 p-4 text-sm text-royalPurple-text2">
        <strong className="text-royalPurple-text1">ECZ Rule 7:</strong> Keep marked work, photos,
        and videos for <strong>{EVIDENCE_RETENTION_YEARS} years</strong>. The system records who
        uploaded what and when, and shows when files may be safely removed.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-royalPurple-border/50 p-3 text-center">
          <p className="text-2xl font-bold text-royalPurple-text1">{summary.total}</p>
          <p className="text-xs text-royalPurple-text3">Total files</p>
        </div>
        <div className="rounded-lg border border-green-500/30 p-3 text-center">
          <p className="text-2xl font-bold text-green-300">{summary.ok}</p>
          <p className="text-xs text-royalPurple-text3">On file</p>
        </div>
        <div className="rounded-lg border border-amber-500/30 p-3 text-center">
          <p className="text-2xl font-bold text-amber-300">{summary.urgent}</p>
          <p className="text-xs text-royalPurple-text3">Expiring &lt; 90 days</p>
        </div>
        <div className="rounded-lg border border-red-500/30 p-3 text-center">
          <p className="text-2xl font-bold text-red-300">{summary.expired}</p>
          <p className="text-xs text-royalPurple-text3">Retention ended</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-40">
          <Label>Filter</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ok">On file</SelectItem>
              <SelectItem value="urgent">Expiring soon</SelectItem>
              <SelectItem value="expired">May delete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowUpload((v) => !v)}>
          <Upload className="h-4 w-4 mr-1" />
          {showUpload ? 'Cancel' : 'Upload evidence'}
        </Button>
        <Button variant="outline" onClick={loadEvidence}>
          Refresh
        </Button>
      </div>

      {showUpload ? (
        <form
          onSubmit={upload}
          className="rounded-xl border border-royalPurple-border/50 p-4 space-y-4 bg-royalPurple-card/40"
        >
          <h4 className="font-semibold text-royalPurple-text1 flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Upload SBA evidence
          </h4>
          <p className="text-xs text-royalPurple-text3">
            Link evidence to a learner&apos;s SBA score record. Record scores first if the list is
            empty.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Form</Label>
              <Select
                value={formLevel}
                onValueChange={(v) => {
                  setFormLevel(v)
                  setScoreId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Form 1</SelectItem>
                  <SelectItem value="2">Form 2</SelectItem>
                  <SelectItem value="3">Form 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SBA score record</Label>
              <Select value={scoreId} onValueChange={setScoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select learner / subject" />
                </SelectTrigger>
                <SelectContent>
                  {scores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                      {s.evidenceCount ? ` · ${s.evidenceCount} file(s)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>File (JPG, PNG, PDF, MP4 — max 25MB)</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm"
              className="mt-1 block w-full text-sm text-royalPurple-text2"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button type="submit" disabled={uploading || !scores.length}>
            {uploading ? 'Uploading…' : 'Store for 2 years'}
          </Button>
          {!scores.length ? (
            <p className="text-xs text-amber-300">
              No scored learners for Form {formLevel}.{' '}
              <Link href="/dashboard/teacher/assessments/ecz" className="underline">
                Record SBA scores
              </Link>{' '}
              first.
            </p>
          ) : null}
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading evidence…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No evidence files yet. Upload marked scripts, photos, or videos after scoring learners.
        </p>
      ) : (
        <ul className="divide-y divide-royalPurple-border/40 rounded-xl border border-royalPurple-border/40 overflow-hidden">
          {rows.map((r) => (
            <li
              key={r.id}
              className="p-4 bg-royalPurple-card/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-royalPurple-text1">{r.fileName}</p>
                  <StatusPill status={r.retentionStatus} />
                </div>
                <p className="text-xs text-royalPurple-text3 mt-1">
                  {r.learnerName} · {r.subject} · Form {r.formLevel}
                </p>
                <p className="text-xs text-royalPurple-text2 mt-1">
                  Uploaded {new Date(r.uploadedAt).toLocaleDateString()} · Expires{' '}
                  {new Date(r.expiryDate).toLocaleDateString()}
                  {r.retentionStatus !== 'expired'
                    ? ` (${r.daysUntilExpiry} days left)`
                    : ' — safe to remove per ECZ'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </a>
                {canDelete && (isManager || r.retentionStatus === 'expired') ? (
                  <Button size="sm" variant="outline" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
