'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

interface TeacherPeriodAssignmentUIProps {
  schoolId: string
  timetableVersionId?: string
}

type TeacherRow = { id: string; name: string }
type TimeSlotRow = {
  id: string
  dayOfWeek: string
  dayOfWeekNumber: number
  period: number
  startTime: string
  endTime: string
  isBreak: boolean
  label?: string | null
  breakName?: string | null
  breakDuration?: number | null
}

type AssignmentRow = {
  id: string
  teacherId: string
  timeSlotId: string
  lockedForGeneration: boolean
  notes?: string | null
  teacher?: { id: string; user?: { name?: string | null } | null } | null
  timeSlot?: TimeSlotRow | null
}

function dayNameFromNumber(n: number) {
  if (n === 1) return 'Monday'
  if (n === 2) return 'Tuesday'
  if (n === 3) return 'Wednesday'
  if (n === 4) return 'Thursday'
  if (n === 5) return 'Friday'
  return 'Day'
}

function dayKeyFromNumber(n: number) {
  if (n === 1) return 'monday'
  if (n === 2) return 'tuesday'
  if (n === 3) return 'wednesday'
  if (n === 4) return 'thursday'
  if (n === 5) return 'friday'
  return 'monday'
}

export default function TeacherPeriodAssignmentUI(props: TeacherPeriodAssignmentUIProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1)
  const [selectedPeriod, setSelectedPeriod] = useState(1)
  const [notes, setNotes] = useState('')

  const teachersQuery = useQuery({
    queryKey: ['teachers', props.schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/teachers?limit=200`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
      const mapped: TeacherRow[] = list.map((t: any) => ({
        id: String(t.id),
        name: String(t?.user?.name || t?.name || t?.fullName || 'Teacher'),
      }))
      return mapped.sort((a, b) => a.name.localeCompare(b.name))
    },
  })

  const timeSlotsQuery = useQuery({
    queryKey: ['timeSlots', props.schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/timetable/timeSlots`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      const list = Array.isArray(json?.data) ? json.data : []
      return list as TimeSlotRow[]
    },
  })

  const assignmentsQuery = useQuery({
    queryKey: ['teacherPeriodAssignments', props.schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/timetable/teacherPeriodAssignments`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      const list = Array.isArray(json?.data) ? json.data : []
      return list as AssignmentRow[]
    },
  })

  const days = useMemo(() => [1, 2, 3, 4, 5], [])

  const periods = useMemo(() => {
    const slots = timeSlotsQuery.data || []
    const uniq = new Set<number>()
    for (const s of slots) {
      if (!s.isBreak) uniq.add(Number(s.period))
    }
    const list = Array.from(uniq)
    if (!list.length) return Array.from({ length: 12 }, (_, i) => i + 1)
    return list.sort((a, b) => a - b)
  }, [timeSlotsQuery.data])

  const slotsByDayPeriod = useMemo(() => {
    const map = new Map<string, TimeSlotRow>()
    for (const s of timeSlotsQuery.data || []) {
      const day = s.dayOfWeekNumber || 0
      map.set(`${day}|${s.period}`, s)
    }
    return map
  }, [timeSlotsQuery.data])

  const assignmentByDayPeriod = useMemo(() => {
    const map = new Map<string, AssignmentRow>()
    for (const a of assignmentsQuery.data || []) {
      const day =
        Number((a.timeSlot as any)?.dayOfWeekNumber) || Number((a.timeSlot as any)?.dayOfWeek) || 0
      const period = Number((a.timeSlot as any)?.period) || 0
      if (day && period) map.set(`${day}|${period}`, a)
    }
    return map
  }, [assignmentsQuery.data])

  const assignMutation = useMutation({
    mutationFn: async () => {
      const slot = slotsByDayPeriod.get(`${selectedDayOfWeek}|${selectedPeriod}`)
      if (!slot) {
        throw new Error('Invalid time slot selection')
      }
      const res = await fetch('/api/timetable/assignTeacherToPeriod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          timeSlotId: slot.id,
          action: 'assign',
          lockForGeneration: true,
          notes: notes || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to assign')
      return json
    },
    onSuccess: () => {
      toast.success('Teacher assigned to period')
      assignmentsQuery.refetch()
      setSelectedTeacherId('')
      setNotes('')
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to assign'),
  })

  const unassignMutation = useMutation({
    mutationFn: async (payload: { teacherId: string; timeSlotId: string }) => {
      const res = await fetch('/api/timetable/assignTeacherToPeriod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: payload.teacherId,
          timeSlotId: payload.timeSlotId,
          action: 'unassign',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to unassign')
      return json
    },
    onSuccess: () => {
      toast.success('Assignment removed')
      assignmentsQuery.refetch()
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to unassign'),
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Draft (Locked Periods)',
          timeoutMs: 20_000,
          maxSolutions: 1500,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to generate')
      return json
    },
    onSuccess: (data: any) => {
      const score = Number(data?.version?.optimizationScore) || 0
      toast.success(`Generated draft (score ${score}/100)`)
    },
    onError: (e: any) => toast.error(e?.message || 'Generation failed'),
  })

  const loading = teachersQuery.isLoading || timeSlotsQuery.isLoading || assignmentsQuery.isLoading

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="onboard-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-royalPurple-text1">
              Assign Teachers to Periods
            </h2>
            <div className="text-sm text-royalPurple-text2 mt-1">
              Phase 2: HOD locks key teacher periods before the solver generates the full timetable.
            </div>
          </div>
        </div>
      </div>

      <div className="onboard-card p-5">
        <div className="text-lg font-semibold text-royalPurple-text1 mb-4">
          Step 1: Select teacher & period
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-royalPurple-text3 mb-2">Teacher</div>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="zsms-select w-full"
              disabled={loading}
            >
              <option value="">Select teacher…</option>
              {(teachersQuery.data || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-royalPurple-text3 mb-2">Day</div>
            <select
              value={String(selectedDayOfWeek)}
              onChange={(e) => setSelectedDayOfWeek(Number(e.target.value) || 1)}
              className="zsms-select w-full"
              disabled={loading}
            >
              {days.map((d) => (
                <option key={d} value={String(d)}>
                  {dayNameFromNumber(d)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-royalPurple-text3 mb-2">Period</div>
            <select
              value={String(selectedPeriod)}
              onChange={(e) => setSelectedPeriod(Number(e.target.value) || 1)}
              className="zsms-select w-full"
              disabled={loading}
            >
              {periods.map((p) => (
                <option key={p} value={String(p)}>
                  Period {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-royalPurple-text3 mb-2">Notes (optional)</div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input w-full"
            placeholder="e.g., Requested by HOD, special arrangement"
            disabled={loading}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedTeacherId || assignMutation.isPending || loading}
            className="zsms-hover-raise"
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign Teacher to Period'}
          </Button>
          <div className="text-xs text-royalPurple-text3">
            {slotsByDayPeriod.has(`${selectedDayOfWeek}|${selectedPeriod}`)
              ? `${dayKeyFromNumber(selectedDayOfWeek).toUpperCase()} P${selectedPeriod}`
              : 'No configured slot for selection'}
          </div>
        </div>
      </div>

      <div className="onboard-card p-5">
        <div className="text-lg font-semibold text-royalPurple-text1 mb-4">
          Step 2: Review assignments
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr className="bg-royalPurple-deep/40">
                <th className="px-3 py-2 text-left text-xs font-semibold text-royalPurple-text3 border-b border-royalPurple-border/40">
                  Day / Period
                </th>
                {periods.map((p) => (
                  <th
                    key={p}
                    className="px-3 py-2 text-center text-xs font-semibold text-royalPurple-text3 border-b border-royalPurple-border/40"
                  >
                    P{p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d} className="border-b border-royalPurple-border/30">
                  <td className="px-3 py-2 font-semibold text-royalPurple-text1 whitespace-nowrap">
                    {dayNameFromNumber(d)}
                  </td>
                  {periods.map((p) => {
                    const slot = slotsByDayPeriod.get(`${d}|${p}`)
                    const a = assignmentByDayPeriod.get(`${d}|${p}`)
                    const isBreak = Boolean(slot?.isBreak)
                    return (
                      <td
                        key={p}
                        className={`px-2 py-2 text-center text-sm ${
                          isBreak ? 'bg-slate-100/70' : 'bg-royalPurple-card/30'
                        }`}
                      >
                        {isBreak ? (
                          <div className="text-xs font-bold text-slate-500">BREAK</div>
                        ) : a ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-sm font-semibold text-royalPurple-accentTx">
                              {String(a.teacher?.user?.name || '').split(' ')[0] ||
                                String(a.teacherId).slice(0, 6)}
                            </div>
                            {a.notes ? (
                              <div className="text-[11px] text-royalPurple-text3 max-w-[120px] truncate">
                                {a.notes}
                              </div>
                            ) : null}
                            {slot ? (
                              <div className="text-[11px] text-royalPurple-text3">
                                {slot.startTime}-{slot.endTime}
                              </div>
                            ) : null}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!slot) return
                                unassignMutation.mutate({
                                  teacherId: a.teacherId,
                                  timeSlotId: slot.id,
                                })
                              }}
                              disabled={unassignMutation.isPending || !slot}
                              className="mt-1"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : slot ? (
                          <div className="text-xs text-royalPurple-text3">—</div>
                        ) : (
                          <div className="text-xs text-royalPurple-text3">N/A</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="onboard-card p-5 border border-royalPurple-success/30 bg-royalPurple-success/5">
        <div className="text-lg font-semibold text-royalPurple-text1 mb-2">Step 3: Ready?</div>
        <div className="text-sm text-royalPurple-text2">
          Once you’ve locked key teacher periods, generate a draft timetable. The solver will
          respect your locked assignments.
        </div>
        <div className="mt-4">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="zsms-hover-raise"
          >
            {generateMutation.isPending ? 'Generating…' : 'Generate Timetable (Respect Locks)'}
          </Button>
        </div>
      </div>
    </div>
  )
}
