'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Assignment, Class, Classroom, Teacher, TimeSlot } from '@/lib/timetable/types'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { useAuth } from '@/lib/auth'

export interface TeacherTimetableViewProps {
  assignments?: Assignment[]
  timeSlots: TimeSlot[]
  teacherId?: string
  classes?: Class[]
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

function toMinutes(t: string) {
  const [h, m] = String(t).split(':')
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
  return hh * 60 + mm
}

export function TeacherTimetableView(props: TeacherTimetableViewProps) {
  const auth = useAuth()
  const storeAssignments = useTimetableStore((s) => s.assignments)
  const assignments = props.assignments ?? storeAssignments

  const effectiveTeacherId =
    props.teacherId ||
    String(
      auth?.user?.teacherProfile?.id ||
        auth?.user?.teacherProfile?.teacherId ||
        auth?.user?.id ||
        ''
    )

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

  const myAssignments = useMemo(() => {
    if (!effectiveTeacherId) return []
    return assignments.filter((a) => String(a.teacherId) === String(effectiveTeacherId))
  }, [assignments, effectiveTeacherId])

  const byCell = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of myAssignments) {
      const k = `${a.dayOfWeek}|${a.period}|${a.startTime}|${a.endTime}`
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(a)
    }
    return map
  }, [myAssignments])

  const className = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of props.classes || []) map.set(String(c.id), c.name)
    return map
  }, [props.classes])

  const roomName = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of props.classrooms || []) map.set(String(r.id), r.name)
    return map
  }, [props.classrooms])

  const summary = useMemo(() => {
    const byDay: Record<string, number> = {}
    for (const a of myAssignments) byDay[a.dayOfWeek] = (byDay[a.dayOfWeek] || 0) + 1
    const total = myAssignments.length
    const busiest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
    const least = Object.entries(byDay).sort((a, b) => a[1] - b[1])[0]
    const workingSlots = baseSlots.filter((s) => !s.isBreak).length
    const free = days.length * workingSlots - total
    return {
      total,
      free: Math.max(0, free),
      busiest: busiest ? `${busiest[0]} (${busiest[1]})` : '—',
      least: least ? `${least[0]} (${least[1]})` : '—',
    }
  }, [myAssignments, baseSlots, days.length])

  const nextClass = useMemo(() => {
    const now = new Date()
    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      now.getDay()
    ]
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const today = myAssignments
      .filter((a) => a.dayOfWeek === weekday)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    return today.find((a) => toMinutes(a.startTime) >= nowMin) || null
  }, [myAssignments])

  const isMobile = props.mobile || false
  const effectiveDays = isMobile ? [selectedDay] : days

  useEffect(() => {
    if (!days.includes(selectedDay)) setSelectedDay(days[0] || 'monday')
  }, [days, selectedDay])

  return (
    <div className="space-y-4">
      <div className="onboard-card p-5">
        <div className="text-royalPurple-text1 font-bold text-lg">My Teaching Timetable</div>
        <div className="text-royalPurple-text2 text-sm mt-1">
          {summary.total} periods/week · {summary.free} free periods · Busiest: {summary.busiest} ·
          Least busy: {summary.least}
        </div>
        {nextClass ? (
          <div className="mt-3 onboard-summary">
            <span className="onboard-summary-title">Next class</span>
            <span className="onboard-summary-meta">
              {nextClass.dayOfWeek} {nextClass.startTime} ·{' '}
              {className.get(String(nextClass.classId)) || 'Class'} ·{' '}
              {roomName.get(String(nextClass.classroomId)) || 'Room'}
            </span>
          </div>
        ) : null}
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
                const isFree = !slot.isBreak && list.length === 0
                return (
                  <div
                    key={key}
                    className={`px-3 py-3 border-l border-royalPurple-border/20 ${
                      slot.isBreak
                        ? 'flex items-center justify-center text-xs font-bold text-slate-500'
                        : isFree
                          ? 'bg-blue-500/10'
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
                              {className.get(String(a.classId)) || 'Class'}
                            </div>
                            <div className="text-[12px] text-slate-600 truncate">
                              {roomName.get(String(a.classroomId)) || 'Room'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-blue-500 text-center">FREE PERIOD</div>
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
