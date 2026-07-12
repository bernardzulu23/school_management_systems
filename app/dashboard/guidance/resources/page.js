'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { RESOURCE_TYPES } from '@/lib/guidance/constants'

export default function GuidanceResourcesPage() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'SUBJECT_FOCUS', title: '', body: '', deadline: '' })

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/guidance/resources?all=1', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load resources')
      setResources(json.data || [])
    } catch (error) {
      toast.error(error.message || 'Could not load career board')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required')
      return
    }
    try {
      const res = await fetch('/api/guidance/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Publish failed')
      toast.success('Resource published')
      setForm({ type: 'SUBJECT_FOCUS', title: '', body: '', deadline: '' })
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not publish')
    }
  }

  const toggleActive = async (id, active) => {
    try {
      const res = await fetch(`/api/guidance/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !active }),
      })
      if (!res.ok) throw new Error('Update failed')
      await load()
    } catch (error) {
      toast.error(error.message || 'Update failed')
    }
  }

  return (
    <DashboardLayout title="Career guidance board">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">Career guidance board</h1>
          <p className="text-royalPurple-text2 text-sm mt-1">
            Publish what pupils should concentrate on, universities that offer those programmes,
            bursaries, and career events. Active posts appear on the student Career guidance page.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Post resource</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <select
              className="rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2 text-sm min-h-[100px]"
              placeholder="Details…"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
            <label className="text-xs text-royalPurple-text2">
              Deadline (optional)
              <input
                type="date"
                className="mt-1 block rounded border border-royalPurple-border bg-royalPurple-card px-2 py-1"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </label>
            <Button onClick={publish} className="w-fit">
              Publish
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Published resources</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : resources.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No resources yet.</p>
            ) : (
              <ul className="space-y-4">
                {resources.map((r) => (
                  <li
                    key={r.id}
                    className="border border-royalPurple-border rounded-lg p-4 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <p className="font-medium text-royalPurple-text1">{r.title}</p>
                      <span className="text-royalPurple-text2">{r.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-royalPurple-text2 mt-2 whitespace-pre-wrap">{r.body}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-royalPurple-text3">
                        {r.active ? 'Active' : 'Hidden'} ·{' '}
                        {new Date(r.postedAt).toLocaleDateString()}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(r.id, r.active)}
                      >
                        {r.active ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
