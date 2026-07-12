'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import toast from 'react-hot-toast'
import { Archive, Download, FileText, Loader2, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CONFIDENTIALITY_TIERS, GUIDANCE_DOC_KINDS } from '@/lib/guidance/constants'

function inferFileType(name) {
  const n = String(name || '').toLowerCase()
  if (n.endsWith('.pdf')) return 'pdf'
  if (n.endsWith('.docx') || n.endsWith('.doc')) return 'docx'
  if (n.endsWith('.png')) return 'png'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpg'
  if (n.endsWith('.webp')) return 'webp'
  if (n.endsWith('.txt')) return 'txt'
  return 'file'
}

function kindLabel(value) {
  return GUIDANCE_DOC_KINDS.find((k) => k.value === value)?.label || value
}

function tierLabel(value) {
  return CONFIDENTIALITY_TIERS.find((t) => t.value === value)?.label || value
}

/**
 * Shared softcopy vault UI — also embedded on case detail with caseId preset.
 */
export function GuidanceDocumentsPanel({
  caseId = null,
  pupilId: lockedPupilId = null,
  compact = false,
}) {
  const [docs, setDocs] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [blobEnabled, setBlobEnabled] = useState(false)
  const [schoolId, setSchoolId] = useState('')
  const [maxBytes, setMaxBytes] = useState(20 * 1024 * 1024)
  const [q, setQ] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    kind: 'GENERAL',
    confidentiality: 'SENSITIVE',
    pupilId: lockedPupilId || '',
    file: null,
  })

  const loadMeta = useCallback(async () => {
    const res = await fetch('/api/guidance/documents/blob-upload', { credentials: 'include' })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      setBlobEnabled(Boolean(json.enabled))
      setMaxBytes(Number(json.maxBytes) || 20 * 1024 * 1024)
      setSchoolId(String(json.schoolId || ''))
    }
  }, [])

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (caseId) params.set('caseId', caseId)
      if (lockedPupilId) params.set('pupilId', lockedPupilId)
      if (kindFilter) params.set('kind', kindFilter)
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/guidance/documents?${params}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load documents')
      setDocs(Array.isArray(json.data) ? json.data : [])
    } catch (err) {
      console.warn('[guidance-documents] load failed', err)
      toast.error('Could not load documents. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [caseId, lockedPupilId, kindFilter, q])

  const loadPupils = useCallback(async () => {
    if (caseId || lockedPupilId) return
    try {
      const res = await fetch('/api/guidance/pupils', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setPupils(Array.isArray(json.data) ? json.data : [])
    } catch {
      // ignore
    }
  }, [caseId, lockedPupilId])

  useEffect(() => {
    loadMeta()
    loadPupils()
  }, [loadMeta, loadPupils])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const maxMb = useMemo(() => Math.round(maxBytes / (1024 * 1024)), [maxBytes])

  const onUpload = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Enter a document title')
      return
    }
    if (!form.file) {
      toast.error('Choose a file to upload')
      return
    }
    if (!blobEnabled) {
      toast.error('Document storage is not available. Contact your administrator.')
      return
    }
    if (form.file.size > maxBytes) {
      toast.error(`File is too large (max ${maxMb} MB)`)
      return
    }

    setUploading(true)
    try {
      const pathname = `guidance/${schoolId || 'school'}/${Date.now()}-${form.file.name}`
        .replace(/[^a-zA-Z0-9/._\- ]/g, '')
        .slice(0, 180)
      const blob = await upload(pathname, form.file, {
        access: 'public',
        handleUploadUrl: '/api/guidance/documents/blob-upload',
      })
      const res = await fetch('/api/guidance/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          kind: form.kind,
          confidentiality: form.confidentiality,
          fileName: form.file.name,
          fileUrl: blob.url,
          fileType: inferFileType(form.file.name),
          fileSize: form.file.size,
          pupilId: form.pupilId || lockedPupilId || null,
          caseId: caseId || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success('Document saved')
      setForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        file: null,
      }))
      await loadDocs()
    } catch (err) {
      console.warn('[guidance-documents] upload failed', err)
      toast.error('Could not upload the document. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const archiveDoc = async (id) => {
    if (!window.confirm('Archive this document? It will be hidden from the active list.')) return
    try {
      const res = await fetch(`/api/guidance/documents/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ archived: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Archive failed')
      toast.success('Document archived')
      await loadDocs()
    } catch (err) {
      console.warn('[guidance-documents] archive failed', err)
      toast.error('Could not archive the document. Please try again.')
    }
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Upload softcopy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onUpload} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="gd-title">Title</Label>
              <Input
                id="gd-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Parent meeting notes — Form 2A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gd-kind">Duty / category</Label>
              <select
                id="gd-kind"
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2.5 text-sm text-royalPurple-text1"
                value={form.kind}
                onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}
              >
                {GUIDANCE_DOC_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gd-tier">Confidentiality</Label>
              <select
                id="gd-tier"
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2.5 text-sm text-royalPurple-text1"
                value={form.confidentiality}
                onChange={(e) => setForm((p) => ({ ...p, confidentiality: e.target.value }))}
              >
                {CONFIDENTIALITY_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {!caseId && !lockedPupilId ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gd-pupil">Link to pupil (optional)</Label>
                <select
                  id="gd-pupil"
                  className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-deep p-2.5 text-sm text-royalPurple-text1"
                  value={form.pupilId}
                  onChange={(e) => setForm((p) => ({ ...p, pupilId: e.target.value }))}
                >
                  <option value="">No pupil link</option>
                  {pupils.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.class || '—'}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="gd-desc">Description (optional)</Label>
              <Input
                id="gd-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="gd-file">File (PDF, Word, or image · max {maxMb} MB)</Label>
              <Input
                id="gd-file"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
              />
              {!blobEnabled ? (
                <p className="text-xs text-amber-700">
                  Secure storage is not configured on this server yet.
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={uploading || !blobEnabled}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  'Save to vault'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Softcopies
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-40"
            />
            <select
              className="rounded-lg border border-royalPurple-border bg-royalPurple-deep px-2 py-2 text-sm text-royalPurple-text1"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {GUIDANCE_DOC_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" onClick={() => loadDocs()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-royalPurple-text2">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-royalPurple-text2">No softcopies yet.</p>
          ) : (
            <ul className="divide-y divide-royalPurple-border/40">
              {docs.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-royalPurple-text1">{doc.title}</p>
                    <p className="text-xs text-royalPurple-text2 mt-0.5">
                      {kindLabel(doc.kind)} · {tierLabel(doc.confidentiality)} · {doc.fileName}
                      {doc.pupil?.name ? ` · ${doc.pupil.name}` : ''}
                      {doc.caseId && !caseId ? (
                        <>
                          {' · '}
                          <Link
                            href={`/dashboard/guidance/cases/${doc.caseId}`}
                            className="underline"
                          >
                            Case
                          </Link>
                        </>
                      ) : null}
                    </p>
                    {doc.description ? (
                      <p className="text-xs text-royalPurple-text2 mt-1">{doc.description}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Open
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => archiveDoc(doc.id)}
                    >
                      <Archive className="h-3.5 w-3.5 mr-1" />
                      Archive
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
