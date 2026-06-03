'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react'

const LABEL_OPTIONS = [
  { value: 'schedule', label: 'Schedule' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'letter', label: 'Letter' },
  { value: 'attachment', label: 'Attachment' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'report', label: 'Report' },
]

/**
 * @param {{ entityType: string, entityId: string, defaultLabel?: string, compact?: boolean }} props
 */
export function HodFileUpload({
  entityType,
  entityId,
  defaultLabel = 'attachment',
  compact = false,
}) {
  const [files, setFiles] = useState([])
  const [label, setLabel] = useState(defaultLabel)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const loadFiles = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/hod/files?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
        { credentials: 'include' }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load files')
      setFiles(json.data || [])
    } catch (e) {
      setError(e.message)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !entityId) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('entityType', entityType)
      fd.append('entityId', entityId)
      fd.append('label', label)
      const res = await fetch('/api/hod/files', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      await loadFiles()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const onDelete = async (id) => {
    if (!confirm('Remove this file?')) return
    try {
      const res = await fetch(`/api/hod/files/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Delete failed')
      }
      await loadFiles()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!entityId) {
    return (
      <p className="text-xs text-royalPurple-text3">
        Save the record first, then upload documents.
      </p>
    )
  }

  return (
    <div
      className={compact ? 'space-y-2' : 'space-y-3 border-t border-royalPurple-border pt-3 mt-3'}
    >
      {!compact && <p className="text-sm font-medium text-royalPurple-text1">Documents</p>}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="text-xs px-2 py-1 border border-royalPurple-border rounded-md"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        >
          {LABEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-royalPurple-border rounded-md cursor-pointer hover:bg-royalPurple-card2">
          <input type="file" className="sr-only" onChange={onUpload} disabled={uploading} />
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload
        </label>
      </div>
      {error && <p className="text-xs text-royalPurple-dangerTx">{error}</p>}
      {loading ? (
        <p className="text-xs text-royalPurple-text3">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-royalPurple-text3">No files uploaded yet.</p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 text-sm bg-royalPurple-page/50 rounded px-2 py-1"
            >
              <a
                href={f.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-royalPurple-accentTx hover:underline truncate"
              >
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {f.fileName} <span className="text-royalPurple-text3">({f.label})</span>
                </span>
              </a>
              <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(f.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
