'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

export type EditablePeriod = {
  id: string
  periodNumber: number
  periodName: string
  startTime: string
  endTime: string
  duration: number | null
  isDouble: boolean
}

interface TimeSlotEditorProps {
  period: EditablePeriod
  onSaved: (updated: EditablePeriod) => void
}

export function TimeSlotEditor({ period, onSaved }: TimeSlotEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [edited, setEdited] = useState(period)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!period.id) {
      toast.error('This period is not stored in the database yet. Save school hours first.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/timetable/timeSlots/${encodeURIComponent(period.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: edited.startTime,
          endTime: edited.endTime,
          label: edited.periodName,
          isDouble: edited.isDouble,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to update period')
      const p = data.period
      const next: EditablePeriod = {
        id: p.id,
        periodNumber: p.period,
        periodName: p.label || edited.periodName,
        startTime: p.startTime,
        endTime: p.endTime,
        duration: p.duration,
        isDouble: Boolean(p.isDouble),
      }
      onSaved(next)
      setIsEditing(false)
      toast.success('Period times updated')
    } catch (e: any) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-royalPurple-text1 truncate">{period.periodName}</p>
          <p className="text-xs text-royalPurple-text3">
            {period.startTime} – {period.endTime}
            {period.duration ? ` (${period.duration} min)` : ''}
            {period.isDouble ? ' · Double' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-royalPurple-accent/40 bg-royalPurple-card/50">
      <input
        type="time"
        className="zsms-input"
        value={edited.startTime}
        onChange={(e) => setEdited({ ...edited, startTime: e.target.value })}
      />
      <input
        type="time"
        className="zsms-input"
        value={edited.endTime}
        onChange={(e) => setEdited({ ...edited, endTime: e.target.value })}
      />
      <label className="flex items-center gap-2 text-xs text-royalPurple-text2">
        <input
          type="checkbox"
          checked={edited.isDouble}
          onChange={(e) => setEdited({ ...edited, isDouble: e.target.checked })}
        />
        Double period
      </label>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setEdited(period)
          setIsEditing(false)
        }}
      >
        Cancel
      </Button>
    </div>
  )
}
