'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Clock } from 'lucide-react'
import { TimeSlotEditor, type EditablePeriod } from '@/components/timetable/TimeSlotEditor'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import {
  normalizeTimetableConfig,
  resolveSchoolTimeSlots,
} from '@/lib/timetable/timeSlotsFromConfig'

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
]

export function TimePeriodManager() {
  const [day, setDay] = useState('monday')
  const [periods, setPeriods] = useState<EditablePeriod[]>([])
  const [loading, setLoading] = useState(true)
  const setStoreTimeSlots = useTimetableStore((s) => s.setTimeSlots)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/timetable/periods?day=${encodeURIComponent(day)}&includeBreaks=true`,
        { cache: 'no-store' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load periods')
      setPeriods(
        (Array.isArray(data.periods) ? data.periods : []).map((p: any) => ({
          id: String(p.id || ''),
          periodNumber: Number(p.periodNumber || 0),
          periodName: String(p.periodName || ''),
          startTime: String(p.startTime || ''),
          endTime: String(p.endTime || ''),
          duration: p.duration != null ? Number(p.duration) : null,
          isDouble: Boolean(p.isDouble),
        }))
      )
    } catch (e: any) {
      toast.error(e?.message || 'Could not load periods')
      setPeriods([])
    } finally {
      setLoading(false)
    }
  }, [day])

  useEffect(() => {
    load()
  }, [load])

  async function refreshBellSchedule() {
    const res = await fetch('/api/timetable/config', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    const normalized = normalizeTimetableConfig(data?.config)
    const slots = resolveSchoolTimeSlots(
      normalized,
      Array.isArray(data?.timeSlots) ? data.timeSlots : []
    )
    if (slots.length) setStoreTimeSlots(slots)
  }

  return (
    <div className="onboard-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Clock className="text-royalPurple-accent shrink-0 mt-0.5" size={22} />
        <div>
          <h2 className="text-lg font-bold text-royalPurple-text1">Period times (database)</h2>
          <p className="text-sm text-royalPurple-text2 mt-1">
            Edit individual period start/end times stored in the database. Changes apply to
            timetable generation and all grid views.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDay(d.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              day === d.key
                ? 'bg-royalPurple-accent text-white border-royalPurple-accent'
                : 'bg-royalPurple-card/40 text-royalPurple-text2 border-royalPurple-border/40'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-royalPurple-text3">Loading periods…</p>
      ) : (
        <div className="space-y-2 max-h-[360px] overflow-y-auto">
          {periods.map((p) => (
            <TimeSlotEditor
              key={`${p.id || p.periodNumber}-${p.startTime}`}
              period={p}
              onSaved={async () => {
                await load()
                await refreshBellSchedule()
              }}
            />
          ))}
          {periods.length === 0 ? (
            <p className="text-sm text-royalPurple-text3">
              No periods for this day. Save school hours above to generate them.
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
