'use client'

import { useMemo, useState } from 'react'
import type { Assignment, Class, Teacher, TimeSlot } from '@/lib/timetable/types'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { uniqueBellRows } from '@/lib/timetable/bellSchedule'
import {
  assignmentOverlapsSlot,
  isContinuationSlot,
  isPrimarySlotForAssignment,
  rowSpanForAssignment,
} from '@/lib/timetable/gridHelpers'
import { resolveCardColor } from '@/lib/timetable/cardColors'
import { teacherDisplayName } from '@/lib/timetable/teacherDisplay'

export type EntityViewMode = 'teacher' | 'class'

function dayOrder(day: string) {
  const map: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }
  return map[String(day).toLowerCase()] || 99
}

export function TimetableEntityView({
  mode,
  assignments,
  timeSlots,
  teachers,
  classes,
}: {
  mode: EntityViewMode
  assignments: Assignment[]
  timeSlots: TimeSlot[]
  teachers: Teacher[]
  classes: Class[]
}) {
  const teacherColors = useTimetableStore((s) => s.teacherColors)
  const conflicts = useTimetableStore((s) => s.conflicts)
  const getTeacherWorkload = useTimetableStore((s) => s.getTeacherWorkload)

  const entities = mode === 'teacher' ? teachers : classes
  const [entityId, setEntityId] = useState('')

  const selectedId = entityId || String(entities[0]?.id || '')

  const filtered = useMemo(() => {
    if (!selectedId) return []
    if (mode === 'teacher') {
      return assignments.filter((a) => String(a.teacherId) === String(selectedId))
    }
    return assignments.filter((a) => String(a.classId) === String(selectedId))
  }, [assignments, mode, selectedId])

  const days = useMemo(() => {
    const set = new Set<string>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    for (const s of timeSlots) set.add(String(s.dayOfWeek))
    return Array.from(set).sort((a, b) => dayOrder(a) - dayOrder(b))
  }, [timeSlots])

  const bellRows = useMemo(() => {
    return uniqueBellRows(timeSlots).filter((s) => !s.isBreak)
  }, [timeSlots])

  const teacherName = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of teachers) m.set(String(t.id), t.fullName)
    return m
  }, [teachers])

  const className = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of classes) m.set(String(c.id), c.name)
    return m
  }, [classes])

  const workload =
    mode === 'teacher' && selectedId
      ? getTeacherWorkload(selectedId as Assignment['teacherId'])
      : null

  const entityLabel =
    mode === 'teacher'
      ? teacherName.get(selectedId) || 'Teacher'
      : className.get(selectedId) || 'Class'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <label className="text-xs text-royalPurple-text3 font-semibold uppercase">
            {mode === 'teacher' ? 'Select teacher' : 'Select class'}
          </label>
          <select
            className="zsms-select w-full mt-1"
            value={selectedId}
            onChange={(e) => setEntityId(e.target.value)}
          >
            {entities.map((e) => (
              <option key={String(e.id)} value={String(e.id)}>
                {mode === 'teacher' ? (e as Teacher).fullName : (e as Class).name}
              </option>
            ))}
          </select>
        </div>
        {workload ? (
          <div className="rounded-lg border border-royalPurple-border/40 bg-royalPurple-card/40 px-4 py-2 text-sm">
            <span className="text-royalPurple-text3">Weekly load: </span>
            <span className="font-bold text-royalPurple-text1">
              {workload.totalPeriods} periods
            </span>
          </div>
        ) : null}
      </div>

      <div className="timetable-container border border-royalPurple-border/40 rounded-2xl overflow-auto bg-royalPurple-card/60">
        <div className="min-w-[720px]">
          <div className="px-4 py-3 border-b border-royalPurple-border/40 bg-royalPurple-deep/80">
            <div className="font-bold text-royalPurple-text1">{entityLabel}</div>
            <div className="text-xs text-royalPurple-text3">
              {mode === 'teacher' ? 'Teacher card view' : 'Class card view'} — like aSc Timetables
            </div>
          </div>

          <div
            className="grid border-b border-royalPurple-border/30"
            style={{ gridTemplateColumns: `120px repeat(${days.length}, minmax(140px, 1fr))` }}
          >
            <div className="px-3 py-2 text-xs font-semibold text-royalPurple-text3">Period</div>
            {days.map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-xs font-semibold text-royalPurple-text2 uppercase"
              >
                {d.slice(0, 3)}
              </div>
            ))}
          </div>

          {bellRows.map((slot) => (
            <div
              key={`${slot.period}-${slot.startTime}`}
              className="grid border-b border-royalPurple-border/20"
              style={{ gridTemplateColumns: `120px repeat(${days.length}, minmax(140px, 1fr))` }}
            >
              <div className="px-3 py-2 text-xs text-royalPurple-text3">
                P{slot.period}
                <div>
                  {slot.startTime}–{slot.endTime}
                </div>
              </div>
              {days.map((day) => {
                const cellAssignments = filtered.filter(
                  (a) =>
                    String(a.dayOfWeek).toLowerCase() === String(day).toLowerCase() &&
                    assignmentOverlapsSlot(a, day, slot) &&
                    isPrimarySlotForAssignment(a, slot)
                )
                const continued = isContinuationSlot(day, slot, filtered, bellRows)
                if (continued) {
                  return <div key={day} className="border-l border-royalPurple-border/10" />
                }
                return (
                  <div
                    key={day}
                    className="px-2 py-2 border-l border-royalPurple-border/10 min-h-[72px]"
                  >
                    {cellAssignments.map((a) => {
                      const rowConflicts = conflicts.get(String(a.id)) || []
                      const colors = resolveCardColor(
                        a.subjectId,
                        a.teacherId,
                        teacherColors[String(a.teacherId || '')]?.colorHex
                      )
                      const span = rowSpanForAssignment(a, bellRows)
                      return (
                        <div
                          key={String(a.id)}
                          className="rounded-lg border px-2 py-1.5 text-xs mb-1"
                          style={{
                            borderColor: rowConflicts.length ? '#f59e0b' : colors.border,
                            background: colors.bg,
                            minHeight: span > 1 ? `${span * 72 - 8}px` : undefined,
                          }}
                        >
                          <div className="font-semibold text-royalPurple-text1 truncate">
                            {(a as any).subjectName ||
                              (mode === 'class'
                                ? teacherName.get(String(a.teacherId))
                                : className.get(String(a.classId)))}
                          </div>
                          <div
                            className="text-royalPurple-text3 truncate font-semibold"
                            title={
                              mode === 'teacher'
                                ? className.get(String(a.classId)) || 'Class'
                                : teacherName.get(String(a.teacherId)) || 'Teacher'
                            }
                          >
                            {mode === 'teacher'
                              ? className.get(String(a.classId))
                              : teacherDisplayName(
                                  teacherName.get(String(a.teacherId)),
                                  'initials'
                                )}
                          </div>
                          {rowConflicts.length ? (
                            <div className="text-[10px] text-amber-500 mt-0.5">Conflict</div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
