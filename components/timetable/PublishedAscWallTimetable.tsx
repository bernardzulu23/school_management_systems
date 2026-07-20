'use client'

import { useEffect, useMemo } from 'react'
import type { Assignment, Class, Teacher, TimeSlot } from '@/lib/timetable/types'
import { AscClassWallGrid } from '@/components/timetable/AscClassWallGrid'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { filterClassesForWallGrid, inferClassGrade } from '@/lib/timetable/activeClasses'
import { sessionFetch } from '@/lib/auth/sessionFetch'

export type PublishedAscWallTimetableProps = {
  assignments: Assignment[]
  timeSlots: TimeSlot[]
  classes?: Class[]
  teachers?: Teacher[]
  emptyMessage?: string
}

export function PublishedAscWallTimetable({
  assignments,
  timeSlots,
  classes: classesProp,
  teachers: teachersProp,
  emptyMessage = 'No published timetable yet. Ask your headteacher to publish the master timetable.',
}: PublishedAscWallTimetableProps) {
  const teacherColors = useTimetableStore((s) => s.teacherColors)
  const setTeacherColors = useTimetableStore((s) => s.setTeacherColors)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (Object.keys(teacherColors || {}).length > 0) return
      try {
        const res = await sessionFetch('/api/timetable/teacher-colors', {
          credentials: 'include',
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && json?.map) setTeacherColors(json.map)
      } catch {
        /* optional */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teacherColors, setTeacherColors])

  const wallClasses = useMemo(() => {
    if (classesProp?.length) {
      const filtered = filterClassesForWallGrid(classesProp, assignments)
      // If the school class list doesn't match assignment ids (stale labels),
      // fall back to deriving rows from assignments so the grid still renders.
      if (filtered.length > 0 || !assignments?.length) return filtered
    }
    const map = new Map<string, Class>()
    for (const a of assignments || []) {
      const id = String(a?.classId || '').trim()
      if (!id || map.has(id)) continue
      map.set(id, {
        id,
        name: String((a as any).className || id),
        grade: inferClassGrade(String((a as any).className || '')),
        students: 0,
        subjects: [],
      })
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    )
  }, [classesProp, assignments])

  const wallTeachers = useMemo(() => {
    if (teachersProp?.length) return teachersProp
    const map = new Map<string, Teacher>()
    for (const a of assignments || []) {
      const id = String(a?.teacherId || '').trim()
      if (!id || map.has(id)) continue
      map.set(id, {
        id,
        fullName: String((a as any).teacherName || 'Teacher'),
        subjects: [],
        availability: [],
        maxHours: { perWeek: 28 },
        traveling: { enabled: false, schools: [] },
      })
    }
    return Array.from(map.values())
  }, [teachersProp, assignments])

  if (!assignments.length) {
    return (
      <div className="rounded-lg border border-[#9ca3af] bg-[#f9fafb] p-8 text-center text-sm text-[#4b5563]">
        {emptyMessage}
      </div>
    )
  }

  if (!timeSlots.length) {
    return (
      <div className="rounded-lg border border-[#9ca3af] bg-[#f9fafb] p-8 text-center text-sm text-[#4b5563]">
        School bell schedule is not configured yet.
      </div>
    )
  }

  return (
    <AscClassWallGrid
      assignments={assignments}
      timeSlots={timeSlots}
      classes={wallClasses}
      teachers={wallTeachers}
      showConflicts={false}
      showUnplacedTray={false}
    />
  )
}
