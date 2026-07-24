'use client'

import { useEffect, useMemo } from 'react'
import type { Assignment, Class, Teacher, TimeSlot } from '@/lib/timetable/types'
import { AscClassWallGrid } from '@/components/timetable/AscClassWallGrid'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import {
  filterClassesForWallGrid,
  inferClassGrade,
  normalizeClassLabel,
} from '@/lib/timetable/activeClasses'
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
    // Row identity MUST be assignment.classId. Matching school Class rows by
    // label only (Form 1A vs Grade 10A rewrites / duplicates) can return a
    // different id → AscClassWallGrid looks up empty cells and the wall looks blank.
    const nameById = new Map<string, string>()
    const nameByLabel = new Map<string, string>()
    for (const c of classesProp || []) {
      const id = String(c.id || '').trim()
      const name = String(c.name || '').trim()
      if (id && name) nameById.set(id, name)
      const lbl = normalizeClassLabel(name, (c as any).yearGroup || (c as any).year_group)
      if (lbl && name) nameByLabel.set(lbl, name)
    }

    const map = new Map<string, Class>()
    for (const a of assignments || []) {
      const id = String(a?.classId || '').trim()
      if (!id || map.has(id)) continue
      const rawName = String((a as any).className || '').trim()
      const lbl = normalizeClassLabel(rawName)
      const name = nameById.get(id) || rawName || nameByLabel.get(lbl) || id
      map.set(id, {
        id,
        name,
        grade: inferClassGrade(name),
        students: 0,
        subjects: [],
      })
    }

    if (map.size > 0) {
      return Array.from(map.values()).sort((a, b) =>
        String(a.name).localeCompare(String(b.name), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      )
    }

    // No assignments yet — keep picker list if provided (empty-state path).
    if (classesProp?.length) return filterClassesForWallGrid(classesProp, assignments)
    return []
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
