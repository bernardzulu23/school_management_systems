'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import {
  GOLDEN_ANGLE_DEG,
  colorsTooClose,
  colorAtStep,
  normalizeHex,
} from '@/lib/timetable/uniqueTeacherColors'

type TeacherColorRow = {
  teacherId: string
  teacherUserId: string
  teacherName: string
  colorHex: string
  colorName: string
  fromDatabase?: boolean
}

/** Suggest unused sample swatches from the same golden-angle series. */
function unusedSuggestions(taken: string[], count = 24): string[] {
  const out: string[] = []
  for (let i = 0; i < 120 && out.length < count; i++) {
    const hex = colorAtStep(-GOLDEN_ANGLE_DEG, i, i).colorHex
    if (taken.some((t) => colorsTooClose(t, hex))) continue
    out.push(hex)
  }
  return out
}

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

  const takenHexes = useMemo(
    () => rows.map((r) => normalizeHex(r.colorHex)).filter(Boolean) as string[],
    [rows]
  )

  async function saveColor(row: TeacherColorRow, hex: string, name?: string) {
    setSavingId(row.teacherUserId)
    try {
      const res = await fetch(
        `/api/timetable/teacher-colors/${encodeURIComponent(row.teacherUserId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colorHex: hex, colorName: name || undefined }),
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

  async function autoAssign(force = false) {
    try {
      const res = await fetch('/api/timetable/teacher-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAssign: true, force }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Auto-assign failed')
      toast.success(
        force
          ? `Reassigned unique colours to ${data.assigned || 0} teachers`
          : `Assigned colours to ${data.assigned || 0} teachers`
      )
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
              Each teacher has exactly one unique colour (aSc style). Colours are stored permanently
              and cannot collide with another teacher at this school.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => autoAssign(false)} className="zsms-hover-raise">
            Fill missing colours
          </Button>
          <Button variant="outline" onClick={() => autoAssign(true)} className="zsms-hover-raise">
            Reassign all unique
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {rows.map((row) => {
          const suggestions = unusedSuggestions(
            takenHexes.filter((h) => h !== normalizeHex(row.colorHex)),
            10
          )
          return (
            <div
              key={row.teacherUserId}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 px-4 py-3"
            >
              <div
                className="w-10 h-10 rounded-lg border border-royalPurple-border/50 shrink-0"
                style={{ backgroundColor: row.colorHex || '#94A3B8' }}
                title={row.colorHex}
              />
              <div className="min-w-[160px] flex-1">
                <div className="font-semibold text-royalPurple-text1">{row.teacherName}</div>
                <div className="text-xs text-royalPurple-text3">{row.colorHex || 'No colour'}</div>
              </div>
              <label className="text-xs text-royalPurple-text3">
                Custom
                <input
                  type="color"
                  className="block mt-1 h-9 w-14 cursor-pointer rounded border border-royalPurple-border/40 bg-transparent"
                  value={normalizeHex(row.colorHex) || '#2563EB'}
                  disabled={savingId === row.teacherUserId}
                  onChange={(e) => saveColor(row, e.target.value, 'Custom')}
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    disabled={savingId === row.teacherUserId}
                    onClick={() => saveColor(row, hex)}
                    className={`w-7 h-7 rounded-md border-2 transition-transform hover:scale-105 ${
                      (row.colorHex || '').toUpperCase() === hex
                        ? 'border-royalPurple-text1 ring-2 ring-royalPurple-accent/40'
                        : 'border-royalPurple-border/40'
                    }`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
