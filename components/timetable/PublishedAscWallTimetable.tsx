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

function clientAgentLog(payload: Record<string, unknown>) {
  const body = JSON.stringify({
    sessionId: 'a471db',
    timestamp: Date.now(),
    runId: 'pre-fix',
    ...payload,
  })
  fetch('/api/debug/agent-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body,
  }).catch(() => {})
  fetch('http://127.0.0.1:7916/ingest/6dcdb48d-b049-4be9-ba0f-aa3c684df7ce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a471db' },
    body,
  }).catch(() => {})
}

/** Detect CSP blocking React inline styles (hypothesis F). */
function useTimetableCspProbe(assignmentCount: number) {
  useEffect(() => {
    const violations: Array<{ effectiveDirective?: string; blockedURI?: string }> = []
    const onViolation = (e: SecurityPolicyViolationEvent) => {
      violations.push({
        effectiveDirective: e.effectiveDirective,
        blockedURI: e.blockedURI,
      })
    }
    document.addEventListener('securitypolicyviolation', onViolation)

    const el = document.createElement('div')
    el.setAttribute('data-tt-csp-probe', '1')
    el.style.width = '123px'
    el.style.backgroundColor = 'rgb(12, 34, 56)'
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    const cs = window.getComputedStyle(el)
    const inlineApplied = cs.width === '123px' || el.style.width === '123px'
    const bgApplied = cs.backgroundColor.includes('12') || el.style.backgroundColor.includes('12')

    // #region agent log
    clientAgentLog({
      hypothesisId: 'F',
      location: 'PublishedAscWallTimetable.tsx:cspProbe',
      message: 'timetable CSP / inline-style probe',
      data: {
        assignmentCount,
        inlineWidthApplied: inlineApplied,
        inlineBgApplied: bgApplied,
        computedWidth: cs.width,
        computedBg: cs.backgroundColor,
      },
    })
    // #endregion

    const t = window.setTimeout(() => {
      // #region agent log
      clientAgentLog({
        hypothesisId: 'F',
        location: 'PublishedAscWallTimetable.tsx:cspViolations',
        message: 'CSP violations after timetable mount',
        data: {
          violationCount: violations.length,
          styleViolations: violations.filter((v) =>
            String(v.effectiveDirective || '').includes('style')
          ).length,
          sample: violations.slice(0, 8),
        },
      })
      // #endregion
      el.remove()
      document.removeEventListener('securitypolicyviolation', onViolation)
    }, 800)

    return () => {
      window.clearTimeout(t)
      el.remove()
      document.removeEventListener('securitypolicyviolation', onViolation)
    }
  }, [assignmentCount])
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

  useTimetableCspProbe(assignments?.length || 0)

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

  // #region agent log
  useEffect(() => {
    clientAgentLog({
      hypothesisId: 'A,E',
      location: 'PublishedAscWallTimetable.tsx:renderState',
      message: 'wall render state',
      data: {
        assignmentCount: assignments?.length || 0,
        timeSlotCount: timeSlots?.length || 0,
        wallClassCount: wallClasses.length,
        wallTeacherCount: wallTeachers.length,
        emptyReason: !assignments?.length
          ? 'no_assignments'
          : !timeSlots?.length
            ? 'no_timeslots'
            : 'rendering_grid',
      },
    })
  }, [assignments, timeSlots, wallClasses.length, wallTeachers.length])
  // #endregion

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
