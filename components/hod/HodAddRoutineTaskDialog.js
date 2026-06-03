'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2 } from 'lucide-react'
import { HodFileUpload } from '@/components/hod/HodFileUpload'

export function HodAddRoutineTaskDialog({ defaultDate, onCreated }) {
  const [open, setOpen] = useState(false)
  const [createdId, setCreatedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    taskDate: defaultDate || new Date().toISOString().slice(0, 10),
    taskTime: '08:00',
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    category: 'Operations',
  })

  const submit = async () => {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/hod/daily-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ kind: 'task', ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
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
        Add Task
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-royalPurple-card border border-royalPurple-border rounded-xl max-w-md w-full p-6 space-y-3">
        <h3 className="font-semibold text-royalPurple-text1">
          {createdId ? 'Attach schedule / checklist' : 'Add department activity'}
        </h3>
        {!createdId ? (
          <>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-md"
              value={form.taskDate}
              onChange={(e) => setForm((f) => ({ ...f, taskDate: e.target.value }))}
            />
            <input
              type="time"
              className="w-full px-3 py-2 border rounded-md"
              value={form.taskTime}
              onChange={(e) => setForm((f) => ({ ...f, taskTime: e.target.value }))}
            />
            <input
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Activity title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="w-full px-3 py-2 border rounded-md min-h-[60px]"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            {error && <p className="text-sm text-royalPurple-dangerTx">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save (notifies teachers)
              </Button>
            </div>
          </>
        ) : (
          <>
            <HodFileUpload
              entityType="daily_routine"
              entityId={createdId}
              defaultLabel="schedule"
            />
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false)
                setCreatedId(null)
              }}
            >
              Done
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
