'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  deleteAnnouncementDraft,
  listAnnouncementDrafts,
  saveAnnouncementDraft,
} from '@/lib/offline/admin-ops'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Megaphone, Trash2 } from 'lucide-react'

export default function NoticeDraftsPage() {
  const [drafts, setDrafts] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setDrafts(await listAnnouncementDrafts())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const resetForm = () => {
    setTitle('')
    setBody('')
    setAudience('all')
    setEditingId(null)
  }

  const onSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setBusy(true)
    try {
      await saveAnnouncementDraft({
        id: editingId || undefined,
        title,
        body,
        audience,
      })
      toast.success(
        editingId
          ? 'Draft updated on this device'
          : 'Draft saved on this device (not published to the server)'
      )
      resetForm()
      await refresh()
    } catch (e) {
      toast.error(e?.message || 'Could not save draft')
    } finally {
      setBusy(false)
    }
  }

  const onEdit = (row) => {
    setEditingId(row.id)
    setTitle(row.title || '')
    setBody(row.body || '')
    setAudience(row.audience || 'all')
  }

  const onDelete = async (id) => {
    if (!window.confirm('Delete this local notice draft?')) return
    await deleteAnnouncementDraft(id)
    if (editingId === id) resetForm()
    await refresh()
    toast.success('Draft deleted')
  }

  return (
    <DashboardLayout title="Notice drafts">
      <div className="space-y-4 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/headteacher">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5" />
              School notice drafts (this device)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-royalPurple-text2">
              Drafts stay in IndexedDB on this browser/device. SMS broadcast and school-wide publish
              still need internet. Use these notes when connectivity is poor, then copy into SMS or
              announcements when you are back online.
            </p>
            <div className="space-y-2">
              <Label htmlFor="notice-title">Title</Label>
              <Input
                id="notice-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Parents meeting Friday"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice-body">Message</Label>
              <textarea
                id="notice-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Write the full notice…"
                className="w-full rounded-md border border-royalPurple-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice-audience">Audience</Label>
              <select
                id="notice-audience"
                className="w-full rounded-md border border-royalPurple-border bg-background px-3 py-2 text-sm"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="all">Everyone</option>
                <option value="teachers">Teachers</option>
                <option value="parents">Parents</option>
                <option value="students">Students</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSave} disabled={busy}>
                {editingId ? 'Update draft' : 'Save draft'}
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetForm} disabled={busy}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved drafts ({drafts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!drafts.length ? (
              <p className="text-sm text-royalPurple-text2">No local drafts yet.</p>
            ) : (
              drafts.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-royalPurple-border/40 px-3 py-3 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-royalPurple-text1">{row.title}</p>
                      <p className="text-xs text-royalPurple-text3">
                        {row.audience || 'all'} · updated{' '}
                        {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {row.body ? (
                    <p className="text-sm text-royalPurple-text2 whitespace-pre-wrap">{row.body}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
