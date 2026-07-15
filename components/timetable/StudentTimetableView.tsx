'use client'

import { useMemo } from 'react'
import type {
  Assignment,
  Class,
  Classroom,
  Teacher,
  TimeSlot,
  SubjectRef,
} from '@/lib/timetable/types'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { useAuth } from '@/lib/auth'
import { teacherDisplayName } from '@/lib/timetable/teacherDisplay'
import { PublishedAscWallTimetable } from '@/components/timetable/PublishedAscWallTimetable'

export interface StudentTimetableViewProps {
  assignments?: Assignment[]
  timeSlots: TimeSlot[]
  classId?: string
  classes?: Class[]
  subjects?: SubjectRef[]
  teachers?: Teacher[]
  classrooms?: Classroom[]
  mobile?: boolean
  subjectOnly?: boolean
}

function toMinutes(t: string) {
  const [h, m] = String(t).split(':')
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
  return hh * 60 + mm
}

export function StudentTimetableView(props: StudentTimetableViewProps) {
  const auth = useAuth()
  const storeAssignments = useTimetableStore((s) => s.assignments)
  const assignments = props.assignments ?? storeAssignments

  const effectiveClassId =
    props.classId ||
    String(auth?.user?.studentProfile?.classId || auth?.user?.studentProfile?.class_id || '')

  const myAssignments = useMemo(() => {
    if (!effectiveClassId) return []
    return assignments.filter((a) => String(a.classId) === String(effectiveClassId))
  }, [assignments, effectiveClassId])

  const teacherName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of props.teachers || []) map.set(String(t.id), t.fullName)
    return map
  }, [props.teachers])

  const subjectName = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of props.subjects || []) map.set(String(s.id), s.name)
    for (const a of myAssignments) {
      if (a.subjectId && (a as any).subjectName) {
        map.set(String(a.subjectId), String((a as any).subjectName))
      }
    }
    return map
  }, [props.subjects, myAssignments])

  const currentClassName = useMemo(() => {
    return props.classes?.find((c) => String(c.id) === String(effectiveClassId))?.name || 'My Class'
  }, [props.classes, effectiveClassId])

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

  const summary = useMemo(() => {
    const total = myAssignments.length
    const byDay: Record<string, number> = {}
    for (const a of myAssignments) byDay[a.dayOfWeek] = (byDay[a.dayOfWeek] || 0) + 1
    const busiest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
    return { total, busiest: busiest ? `${busiest[0]} (${busiest[1]})` : '—' }
  }, [myAssignments])

  return (
    <div className="space-y-4">
      <div className="onboard-card p-5 print:hidden">
        <div className="text-royalPurple-text1 font-bold text-lg">
          {props.subjectOnly ? 'Your subjects timetable' : 'Your Class Timetable'}
        </div>
        <div className="text-royalPurple-text2 text-sm mt-1">
          {currentClassName} · {summary.total} periods/week · Busiest: {summary.busiest}
        </div>
        {nextClass ? (
          <div className="mt-3 onboard-summary">
            <span className="onboard-summary-title">Next class</span>
            <span className="onboard-summary-meta">
              {nextClass.dayOfWeek} {nextClass.startTime} ·{' '}
              {subjectName.get(String(nextClass.subjectId)) ||
                (nextClass as any).subjectName ||
                'Subject'}
              {!props.subjectOnly ? (
                <>
                  {' · '}
                  <span title={teacherName.get(String(nextClass.teacherId)) || 'Teacher'}>
                    {teacherDisplayName(teacherName.get(String(nextClass.teacherId)), 'initials')}
                  </span>
                </>
              ) : null}
            </span>
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
