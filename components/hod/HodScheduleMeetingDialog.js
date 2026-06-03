'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2 } from 'lucide-react'
import { HodFileUpload } from '@/components/hod/HodFileUpload'

/**
 * @param {{ meetingScope?: 'department' | 'staff', onCreated?: () => void }} props
 */
export function HodScheduleMeetingDialog({ meetingScope = 'department', onCreated }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [createdId, setCreatedId] = useState(null)
  const [form, setForm] = useState({
    title: '',
    meetingDate: new Date().toISOString().slice(0, 10),
    meetingTime: '09:00',
    duration: '1 hour',
    location: '',
    meetingType: meetingScope === 'staff' ? 'Staff' : 'Department',
    agenda: '',
  })

  const reset = () => {
    setForm({
      title: '',
      meetingDate: new Date().toISOString().slice(0, 10),
      meetingTime: '09:00',
      duration: '1 hour',
      location: '',
      meetingType: meetingScope === 'staff' ? 'Staff' : 'Department',
      agenda: '',
    })
    setCreatedId(null)
    setError(null)
  }

  const submit = async () => {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const agenda = form.agenda
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const res = await fetch('/api/hod/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title.trim(),
          meetingDate: form.meetingDate,
          meetingTime: form.meetingTime,
          duration: form.duration,
          location: form.location,
          meetingType: form.meetingType,
          meetingScope,
          status: 'scheduled',
          agenda,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not schedule meeting')
      setCreatedId(json.data?.id)
      onCreated?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Schedule Meeting
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h3 className="text-lg font-semibold text-royalPurple-text1">
          {createdId ? 'Upload schedule & documents' : 'Schedule department meeting'}
        </h3>

        {!createdId ? (
          <>
            <input
              className="w-full px-3 py-2 border border-royalPurple-border rounded-md"
              placeholder="Meeting title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="px-3 py-2 border border-royalPurple-border rounded-md"
                value={form.meetingDate}
                onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
              />
              <input
                type="time"
                className="px-3 py-2 border border-royalPurple-border rounded-md"
                value={form.meetingTime}
                onChange={(e) => setForm((f) => ({ ...f, meetingTime: e.target.value }))}
              />
            </div>
            <input
              className="w-full px-3 py-2 border border-royalPurple-border rounded-md"
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <textarea
              className="w-full px-3 py-2 border border-royalPurple-border rounded-md min-h-[80px]"
              placeholder="Agenda items (one per line)"
              value={form.agenda}
              onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
            />
            {error && <p className="text-sm text-royalPurple-dangerTx">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save & notify teachers
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-royalPurple-text2">
              Teachers in your department will see this on their dashboard with a countdown. Upload
              the schedule, agenda, or minutes PDF below.
            </p>
            <HodFileUpload entityType="meeting" entityId={createdId} defaultLabel="schedule" />
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
