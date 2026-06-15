'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ResponsiveDashboardLayout from '@/components/dashboard/ResponsiveDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Brain,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { upload } from '@vercel/blob/client'

const GRADE_OPTIONS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Grade 7', 'Grade 9']

// Direct multipart upload goes through the serverless function, whose request
// body is capped (Vercel ~4.5 MB). When blob storage is configured the browser
// uploads straight to storage and we allow much larger files.
const MAX_DIRECT_MB = 4
const MAX_DIRECT_BYTES = MAX_DIRECT_MB * 1024 * 1024
const MAX_BLOB_MB = 50
const MAX_BLOB_BYTES = MAX_BLOB_MB * 1024 * 1024

function inferFileType(fileName) {
  const lower = String(fileName || '').toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.txt')) return 'txt'
  return ''
}

async function getCsrfToken() {
  const fromCookie = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('csrf_token='))
  if (fromCookie) return decodeURIComponent(fromCookie.split('=').slice(1).join('='))
  const res = await fetch('/api/csrf-token', { credentials: 'include' })
  const json = await res.json().catch(() => ({}))
  return json?.token || ''
}

export default function AiMaterialsPage() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [materials, setMaterials] = useState([])
  const [assignedSubjects, setAssignedSubjects] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    subject: '',
    gradeLevel: '',
    file: null,
  })
  // Whether direct-to-blob upload is available (set from the server).
  const [blobEnabled, setBlobEnabled] = useState(false)
  const maxBytes = blobEnabled ? MAX_BLOB_BYTES : MAX_DIRECT_BYTES
  const maxMb = blobEnabled ? MAX_BLOB_MB : MAX_DIRECT_MB

  useEffect(() => {
    let cancelled = false
    fetch('/api/materials/blob-upload', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setBlobEnabled(Boolean(j?.enabled))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/teaching-assignments', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const rows = Array.isArray(json?.data) ? json.data : []
        const names = [
          ...new Set(rows.map((a) => String(a.subjectName || '').trim()).filter(Boolean)),
        ]
        setAssignedSubjects(names.sort((a, b) => a.localeCompare(b)))
        if (names[0]) {
          setForm((prev) => ({ ...prev, subject: prev.subject || names[0] }))
        }
      })
      .catch(() => setAssignedSubjects([]))
      .finally(() => {
        if (!cancelled) setAssignmentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/materials', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load materials')
      setMaterials(Array.isArray(json?.data) ? json.data : [])
    } catch (e) {
      toast.error(e.message || 'Could not load AI materials')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return materials
    return materials.filter(
      (m) =>
        String(m.title || '')
          .toLowerCase()
          .includes(q) ||
        String(m.subject || '')
          .toLowerCase()
          .includes(q) ||
        String(m.gradeLevel || '')
          .toLowerCase()
          .includes(q)
    )
  }, [materials, search])

  const resetForm = () => {
    setForm({
      title: '',
      subject: assignedSubjects[0] || '',
      gradeLevel: '',
      file: null,
    })
    setShowForm(false)
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null
    if (file && file.size > maxBytes) {
      toast.error(
        `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${maxMb} MB${
          blobEnabled ? '.' : ' — split the document or paste its text instead.'
        }`
      )
      e.target.value = ''
      return
    }
    setForm((prev) => ({
      ...prev,
      file,
      title: prev.title || (file?.name ? file.name.replace(/\.[^.]+$/, '') : ''),
    }))
  }

  const uploadMaterial = async (e) => {
    e.preventDefault()
    if (!form.file) {
      toast.error('Choose a PDF, DOCX, or TXT file')
      return
    }
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.subject.trim()) {
      toast.error('Select the subject you teach for this material')
      return
    }
    if (form.file.size > maxBytes) {
      toast.error(
        `File is too large (limit ${maxMb} MB)${
          blobEnabled ? '.' : '. Split the document or paste its text instead.'
        }`
      )
      return
    }

    setUploading(true)
    try {
      const csrf = await getCsrfToken()
      let json

      if (blobEnabled) {
        // Upload the file straight to blob storage (bypasses the request-body
        // limit), then ask the server to ingest it by URL.
        const blob = await upload(form.file.name, form.file, {
          access: 'public',
          handleUploadUrl: '/api/materials/blob-upload',
        })
        const res = await fetch('/api/materials/ingest', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrf ? { 'x-csrf-token': csrf } : {}),
          },
          body: JSON.stringify({
            fileUrl: blob.url,
            fileType: inferFileType(form.file.name),
            title: form.title.trim(),
            subject: form.subject || undefined,
            gradeLevel: form.gradeLevel || undefined,
          }),
        })
        json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.message || json?.error || 'Indexing failed')
      } else {
        // Small files: send directly through the serverless function.
        const body = new FormData()
        body.append('file', form.file)
        body.append('title', form.title.trim())
        if (form.subject) body.append('subject', form.subject)
        if (form.gradeLevel) body.append('gradeLevel', form.gradeLevel)
        body.append('fileUrl', form.file.name)

        const res = await fetch('/api/materials/ingest', {
          method: 'POST',
          credentials: 'include',
          headers: csrf ? { 'x-csrf-token': csrf } : {},
          body,
        })
        if (res.status === 413) {
          throw new Error(
            `File too large for the server to accept (limit ~${MAX_DIRECT_MB} MB). Split the document into smaller files or paste its text.`
          )
        }
        json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.message || json?.error || 'Upload failed')
      }

      toast.success(
        `Indexed ${json.chunksIndexed ?? 0} chunks${json.materialTitle ? ` for "${json.materialTitle}"` : ''}`
      )
      resetForm()
      await loadMaterials()
    } catch (err) {
      toast.error(err.message || 'Indexing failed')
    } finally {
      setUploading(false)
    }
  }

  const deleteMaterial = async (material) => {
    const ok = window.confirm(`Delete "${material.title}" and all indexed chunks?`)
    if (!ok) return
    try {
      const csrf = await getCsrfToken()
      const res = await fetch(`/api/materials/${encodeURIComponent(material.id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrf ? { 'x-csrf-token': csrf } : {},
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Delete failed')
      toast.success('Material removed')
      await loadMaterials()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  return (
    <ResponsiveDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Link href="/dashboard/teacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
                <Brain className="h-6 w-6" />
                AI Reference Materials
              </h1>
              <p className="text-sm text-royalPurple-text2 mt-1 max-w-xl">
                Upload notes, syllabi, or textbook excerpts (PDF, DOCX, TXT). ZSMS chunks and embeds
                them so lesson plans, quizzes, and ECZ practice ground in your school&apos;s
                content.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            Upload for AI
          </Button>
        </div>

        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 text-sm text-royalPurple-text2">
            Student-facing files live under{' '}
            <Link href="/dashboard/teacher/materials" className="text-accent underline">
              Study Materials
            </Link>
            . This page is only for documents that should inform AI generation.
          </CardContent>
        </Card>

        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Index new material</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={uploadMaterial} className="space-y-4 max-w-lg">
                <div>
                  <Label htmlFor="rag-title">Title</Label>
                  <Input
                    id="rag-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Form 3 Biology Unit 2 notes"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rag-subject">Subject you teach *</Label>
                  {assignmentsLoading ? (
                    <p className="text-sm text-royalPurple-text3">Loading your assignments…</p>
                  ) : assignedSubjects.length === 0 ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      No teaching assignments found. Ask your headteacher to assign your classes and
                      subjects before uploading AI materials.
                    </p>
                  ) : (
                    <select
                      id="rag-subject"
                      className="w-full rounded-md border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      required
                    >
                      {assignedSubjects.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-xs text-royalPurple-text3">
                    Materials are indexed only for subjects on your teaching load so quizzes and
                    lesson plans stay scoped to what you teach.
                  </p>
                </div>
                <div>
                  <Label htmlFor="rag-grade">Grade / form (optional)</Label>
                  <select
                    id="rag-grade"
                    className="w-full rounded-md border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm"
                    value={form.gradeLevel}
                    onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                  >
                    <option value="">— Not specified —</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="rag-file">File (PDF, DOCX, or TXT — max {maxMb} MB)</Label>
                  <Input
                    id="rag-file"
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,text/plain"
                    onChange={onFileChange}
                    required
                  />
                  <p className="mt-1 text-xs text-royalPurple-text3">
                    {blobEnabled
                      ? `Large documents upload directly to secure storage (up to ${maxMb} MB).`
                      : `Larger documents: split them into parts under ${maxMb} MB and upload each.`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={uploading || assignmentsLoading || !assignedSubjects.length}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Indexing…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload &amp; index
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} disabled={uploading}>
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-royalPurple-text3">
                  Indexing may take up to a minute on large PDFs. Requires{' '}
                  <code className="text-xs">HUGGINGFACE_API_KEY</code> on the server.
                </p>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-royalPurple-text3" />
            <Input
              className="pl-9"
              placeholder="Search by title or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadMaterials} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-royalPurple-text2">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No AI reference materials yet.</p>
              <p className="text-sm mt-1">
                Upload a PDF or DOCX to ground lesson plans and quizzes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-royalPurple-text1">{m.title}</h3>
                    <p className="text-sm text-royalPurple-text2">
                      {[m.subject, m.gradeLevel, m.fileType?.toUpperCase()]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="text-xs text-royalPurple-text3 mt-1">
                      {m.chunksIndexed} chunk{m.chunksIndexed === 1 ? '' : 's'} indexed ·{' '}
                      {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMaterial(m)}
                      className="text-royalPurple-dangerTx"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  )
}
