'use client'

import { useMemo } from 'react'
import type { Assignment, Class, Classroom, TimeSlot, SubjectRef } from '@/lib/timetable/types'
import { uniqueBellRows } from '@/lib/timetable/bellSchedule'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { useAuth } from '@/lib/auth'
import { PublishedAscWallTimetable } from '@/components/timetable/PublishedAscWallTimetable'

export interface TeacherTimetableViewProps {
  assignments?: Assignment[]
  timeSlots: TimeSlot[]
  teacherId?: string
  classes?: Class[]
  subjects?: SubjectRef[]
  classrooms?: Classroom[]
  mobile?: boolean
  term?: string
  academicYear?: string
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

  // TimetableAllocationEntry.teacherId is User.id — never Teacher.id
  const effectiveTeacherId =
    props.teacherId || String(auth?.user?.id || auth?.user?.teacherProfile?.userId || '')

  const myAssignments = useMemo(() => {
    if (!effectiveTeacherId) return []
    return assignments.filter((a) => String(a.teacherId) === String(effectiveTeacherId))
  }, [assignments, effectiveTeacherId])

  const className = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of props.classes || []) map.set(String(c.id), c.name)
    return map
  }, [props.classes])

  const summary = useMemo(() => {
    const byDay: Record<string, number> = {}
    for (const a of myAssignments) byDay[a.dayOfWeek] = (byDay[a.dayOfWeek] || 0) + 1
    const total = myAssignments.length
    const busiest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
    const least = Object.entries(byDay).sort((a, b) => a[1] - b[1])[0]
    const workingSlots = uniqueBellRows(props.timeSlots).filter((s) => !s.isBreak).length
    const free = 5 * workingSlots - total
    return {
      total,
      free: Math.max(0, free),
      busiest: busiest ? `${busiest[0]} (${busiest[1]})` : '—',
      least: least ? `${least[0]} (${least[1]})` : '—',
    }
  }, [myAssignments, props.timeSlots])

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

  return (
    <div className="space-y-4">
      <div className="onboard-card p-5 print:hidden">
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
              {className.get(String(nextClass.classId)) || 'Class'}
            </span>
          </div>
        ) : null}
        {effectiveTeacherId && props.term && props.academicYear ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="text-xs px-3 py-1.5 rounded-lg border border-royalPurple-border text-royalPurple-text1 hover:bg-royalPurple-card/40"
              href={`/api/timetable/export-schedule?scope=teacher&id=${encodeURIComponent(effectiveTeacherId)}&term=${encodeURIComponent(props.term)}&academicYear=${encodeURIComponent(props.academicYear)}&format=docx`}
            >
              Download Word
            </a>
            <a
              className="text-xs px-3 py-1.5 rounded-lg border border-royalPurple-border text-royalPurple-text1 hover:bg-royalPurple-card/40"
              href={`/api/timetable/export-schedule?scope=teacher&id=${encodeURIComponent(effectiveTeacherId)}&term=${encodeURIComponent(props.term)}&academicYear=${encodeURIComponent(props.academicYear)}&format=html`}
              target="_blank"
              rel="noreferrer"
            >
              Print / PDF
            </a>
          </div>
        ) : null}
      </div>

      <PublishedAscWallTimetable
        assignments={myAssignments}
        timeSlots={props.timeSlots}
        classes={props.classes}
      />
    </div>
  )
}
