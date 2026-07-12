'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

function toIsoFromLocal(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

export default function SicActivityPlansPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sic/activity-plans', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load activity plans')
      setRows(json.data || [])
    } catch (error) {
      toast.error(error.message || 'Could not load activity plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createPlan = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/sic/activity-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startDate: toIsoFromLocal(startDate),
          endDate: toIsoFromLocal(endDate),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not create plan')
      toast.success('Activity plan created')
      setTitle('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not create activity plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="School CPD activity plans">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">School CPD activity plans</h1>
          <p className="text-royalPurple-text2 mt-1">
            Build school-wide CPD calendars from department reports and HIM outcomes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New activity plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="text-royalPurple-text2">Title</span>
              <input
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-royalPurple-text2">Description</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2 min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-royalPurple-text2">Start</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-royalPurple-text2">End</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
            <Button onClick={createPlan} disabled={saving}>
              {saving ? 'Saving…' : 'Create plan'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : rows.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No school activity plans yet.</p>
            ) : (
              <ul className="divide-y divide-royalPurple-border">
                {rows.map((row) => (
                  <li key={row.id} className="py-3">
                    <p className="font-medium text-royalPurple-text1">{row.title}</p>
                    <p className="text-sm text-royalPurple-text2">
                      {formatDate(row.startDate)} – {formatDate(row.endDate)}
                      {row.createdBy?.name ? ` · ${row.createdBy.name}` : ''}
                    </p>
                    {row.description ? (
                      <p className="text-sm text-royalPurple-text2 mt-1">{row.description}</p>
                    ) : null}
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
