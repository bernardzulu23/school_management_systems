'use client'

import { useMemo, useState } from 'react'
import type { Assignment, Classroom, Teacher, TimeSlot } from '@/lib/timetable/types'
import { useTimetableStore } from '@/lib/timetable/timetableStore'

export interface DepartmentTimetableViewProps {
  assignments?: Assignment[]
  timeSlots: TimeSlot[]
  departmentTeacherIds: string[]
  teachers?: Teacher[]
  classrooms?: Classroom[]
  mobile?: boolean
}

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

function slotKey(slot: Pick<TimeSlot, 'period' | 'startTime' | 'endTime' | 'isBreak'>) {
  return `${slot.period}|${slot.startTime}|${slot.endTime}|${slot.isBreak ? 1 : 0}`
}

export function DepartmentTimetableView(props: DepartmentTimetableViewProps) {
  const storeAssignments = useTimetableStore((s) => s.assignments)
  const assignments = props.assignments ?? storeAssignments
  const [selectedDay, setSelectedDay] = useState('monday')

  const days = useMemo(() => {
    const set = new Set<string>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    for (const s of props.timeSlots) set.add(String(s.dayOfWeek))
    const list = Array.from(set)
    return list.sort((a, b) => dayOrder(a) - dayOrder(b))
  }, [props.timeSlots])

  const baseSlots = useMemo(() => {
    const map = new Map<string, TimeSlot>()
    for (const s of props.timeSlots) {
      const k = slotKey(s)
      if (!map.has(k)) map.set(k, { ...s, dayOfWeek: 'monday' })
    }
    return Array.from(map.values()).sort((a, b) => a.period - b.period)
  }, [props.timeSlots])

  const teacherSet = useMemo(
    () => new Set(props.departmentTeacherIds.map(String)),
    [props.departmentTeacherIds]
  )

  const deptAssignments = useMemo(() => {
    return assignments.filter((a) => teacherSet.has(String(a.teacherId)))
  }, [assignments, teacherSet])

  const byCell = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of deptAssignments) {
      const k = `${a.dayOfWeek}|${a.period}|${a.startTime}|${a.endTime}`
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(a)
    }
    return map
  }, [deptAssignments])

  const teacherName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of props.teachers || []) map.set(String(t.id), t.fullName)
    return map
  }, [props.teachers])

  const roomName = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of props.classrooms || []) map.set(String(r.id), r.name)
    return map
  }, [props.classrooms])

  const isMobile = props.mobile || false
  const effectiveDays = isMobile ? [selectedDay] : days

  return (
    <div className="space-y-4">
      <div className="onboard-card p-5">
        <div className="text-royalPurple-text1 font-bold text-lg">Department Timetable</div>
        <div className="text-royalPurple-text2 text-sm mt-1">
          Showing {deptAssignments.length} department periods across{' '}
          {props.departmentTeacherIds.length} teacher(s).
        </div>
      </div>

      {isMobile ? (
        <div className="flex flex-wrap gap-2">
          {days.slice(0, 5).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                selectedDay === d
                  ? 'bg-royalPurple-accent text-white border-royalPurple-accent'
                  : 'bg-royalPurple-card/40 text-royalPurple-text2 border-royalPurple-border/40'
              }`}
            >
              {d.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}

      <div className="border border-royalPurple-border/40 rounded-2xl overflow-auto bg-royalPurple-card/60">
        <div className="min-w-[900px]">
          <div
            className="grid sticky top-0 z-10 bg-royalPurple-deep/95 backdrop-blur border-b border-royalPurple-border/40"
            style={{
              gridTemplateColumns: `200px repeat(${effectiveDays.length}, minmax(220px, 1fr))`,
            }}
          >
            <div className="px-4 py-3 text-xs font-semibold text-royalPurple-text3 uppercase">
              Time
            </div>
            {effectiveDays.map((d) => (
              <div
                key={d}
                className="px-4 py-3 text-xs font-semibold text-royalPurple-text2 uppercase"
              >
                {d.slice(0, 3)}
              </div>
            ))}
          </div>

          {baseSlots.map((slot) => (
            <div
              key={slotKey(slot)}
              className={`grid border-b border-royalPurple-border/20 ${slot.isBreak ? 'bg-slate-100/70' : ''}`}
              style={{
                gridTemplateColumns: `200px repeat(${effectiveDays.length}, minmax(220px, 1fr))`,
              }}
            >
              <div className="px-4 py-3">
                <div className="font-semibold text-royalPurple-text1 text-sm">
                  {slot.label || (slot.isBreak ? 'BREAK' : `Period ${slot.period}`)}
                </div>
                <div className="text-xs text-royalPurple-text3">
                  {slot.startTime}–{slot.endTime}
                </div>
              </div>
              {effectiveDays.map((day) => {
                const key = `${day}|${slot.period}|${slot.startTime}|${slot.endTime}`
                const list = byCell.get(key) || []
                return (
                  <div
                    key={key}
                    className={`px-3 py-3 border-l border-royalPurple-border/20 ${
                      slot.isBreak
                        ? 'flex items-center justify-center text-xs font-bold text-slate-500'
                        : ''
                    }`}
                  >
                    {slot.isBreak ? (
                      <div className="text-center">BREAK</div>
                    ) : list.length ? (
                      <div className="space-y-2">
                        {list.map((a) => (
                          <div
                            key={String(a.id)}
                            className="rounded-xl border border-royalPurple-border/40 bg-white/70 px-3 py-2"
                          >
                            <div className="font-bold text-[13px] text-slate-900 truncate">
                              {String(a.subjectId)}
                            </div>
                            <div className="text-[12px] text-slate-600 truncate">
                              {teacherName.get(String(a.teacherId)) || 'Teacher'} ·{' '}
                              {roomName.get(String(a.classroomId)) || 'Room'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-royalPurple-text3">—</div>
                    )}
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
