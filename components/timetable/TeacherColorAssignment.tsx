'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTimetableStore } from '@/lib/timetable/timetableStore'

type TeacherColorRow = {
  teacherId: string
  teacherUserId: string
  teacherName: string
  colorHex: string
  colorName: string
  fromDatabase?: boolean
}

const PALETTE = [
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#16a34a', name: 'Green' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#9333ea', name: 'Purple' },
  { hex: '#ea580c', name: 'Orange' },
  { hex: '#0891b2', name: 'Teal' },
  { hex: '#db2777', name: 'Pink' },
  { hex: '#ca8a04', name: 'Gold' },
  { hex: '#4f46e5', name: 'Indigo' },
  { hex: '#0d9488', name: 'Turquoise' },
]

export function TeacherColorAssignment() {
  const [rows, setRows] = useState<TeacherColorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const setTeacherColors = useTimetableStore((s) => s.setTeacherColors)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/timetable/teacher-colors', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load teacher colours')
      setRows(Array.isArray(data.colors) ? data.colors : [])
      if (data.map) setTeacherColors(data.map)
    } catch (e: any) {
      toast.error(e?.message || 'Could not load teacher colours')
    } finally {
      setLoading(false)
    }
  }, [setTeacherColors])

  useEffect(() => {
    load()
  }, [load])

  async function saveColor(row: TeacherColorRow, hex: string, name: string) {
    setSavingId(row.teacherUserId)
    try {
      const res = await fetch(
        `/api/timetable/teacher-colors/${encodeURIComponent(row.teacherUserId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colorHex: hex, colorName: name }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Save failed')
      toast.success(`Colour updated for ${row.teacherName}`)
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save colour')
    } finally {
      setSavingId('')
    }
  }

  async function autoAssign() {
    try {
      const res = await fetch('/api/timetable/teacher-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAssign: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Auto-assign failed')
      toast.success(`Assigned colours to ${data.assigned || 0} teachers`)
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Auto-assign failed')
    }
  }

  if (loading) {
    return (
      <div className="onboard-card p-5 text-sm text-royalPurple-text2">
        Loading teacher colours…
      </div>
    )
  }

  return (
    <div className="onboard-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Palette className="text-royalPurple-accent shrink-0 mt-0.5" size={22} />
          <div>
            <h2 className="text-lg font-bold text-royalPurple-text1">Teacher colour codes</h2>
            <p className="text-sm text-royalPurple-text2 mt-1">
              Assign a colour to each teacher so timetable cards are easy to distinguish (aSc
              style). Colours are stored in the database and used on every timetable view.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={autoAssign} className="zsms-hover-raise">
          Auto-assign palette
        </Button>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {rows.map((row) => (
          <div
            key={row.teacherUserId}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 px-4 py-3"
          >
            <div className="min-w-[160px] flex-1">
              <div className="font-semibold text-royalPurple-text1">{row.teacherName}</div>
              <div className="text-xs text-royalPurple-text3">{row.colorName || 'No colour'}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  disabled={savingId === row.teacherUserId}
                  onClick={() => saveColor(row, c.hex, c.name)}
                  className={`w-9 h-9 rounded-lg border-2 transition-transform hover:scale-105 ${
                    row.colorHex.toLowerCase() === c.hex.toLowerCase()
                      ? 'border-royalPurple-text1 ring-2 ring-royalPurple-accent/40'
                      : 'border-royalPurple-border/40'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
            <div
              className="w-10 h-10 rounded-lg border border-royalPurple-border/40 shrink-0"
              style={{ backgroundColor: row.colorHex }}
              title={row.colorName}
            />
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-royalPurple-text3">No teachers found for this school.</p>
        ) : null}
      </div>
    </div>
  )
}
