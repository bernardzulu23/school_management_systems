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
  return new Date(value).toLocaleString()
}

export default function SicHimPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [agenda, setAgenda] = useState('')
  const [minutesDraft, setMinutesDraft] = useState({})

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sic/him', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load HIM meetings')
      setRows(json.data || [])
    } catch (error) {
      toast.error(error.message || 'Could not load HIM meetings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createMeeting = async () => {
    const iso = toIsoFromLocal(meetingDate)
    if (!title.trim() || !iso) {
      toast.error('Title and meeting date are required')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/sic/him', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          meetingDate: iso,
          agenda: agenda.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not create meeting')
      toast.success('HIM scheduled')
      setTitle('')
      setMeetingDate('')
      setAgenda('')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not create HIM')
    } finally {
      setSaving(false)
    }
  }

  const saveMinutes = async (id) => {
    const minutes = String(minutesDraft[id] || '').trim()
    if (minutes.length < 5) {
      toast.error('Enter meeting minutes')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/sic/him', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, minutes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save minutes')
      toast.success('Minutes saved')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not save minutes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="HIM meetings">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1">
            Headteacher In-service Meetings
          </h1>
          <p className="text-royalPurple-text2 mt-1">
            Schedule HIM sessions and record minutes as School In-service Coordinator.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule HIM</CardTitle>
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
              <span className="text-royalPurple-text2">Meeting date & time</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-royalPurple-text2">Agenda</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2 min-h-[80px]"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
              />
            </label>
            <Button onClick={createMeeting} disabled={saving}>
              {saving ? 'Saving…' : 'Schedule'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : rows.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No HIM meetings yet.</p>
            ) : (
              <ul className="divide-y divide-royalPurple-border space-y-2">
                {rows.map((row) => (
                  <li key={row.id} className="py-4 space-y-2">
                    <p className="font-medium text-royalPurple-text1">{row.title}</p>
                    <p className="text-sm text-royalPurple-text2">
                      {formatDate(row.meetingDate)} · {row.status}
                    </p>
                    {row.agenda ? (
                      <p className="text-sm text-royalPurple-text2">Agenda: {row.agenda}</p>
                    ) : null}
                    {row.minutes ? (
                      <p className="text-sm text-royalPurple-text2 whitespace-pre-wrap">
                        {row.minutes}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2 min-h-[80px]"
                          placeholder="Record minutes…"
                          value={minutesDraft[row.id] || ''}
                          onChange={(e) =>
                            setMinutesDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                          }
                        />
                        <Button size="sm" disabled={saving} onClick={() => saveMinutes(row.id)}>
                          Save minutes
                        </Button>
                      </div>
                    )}
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
