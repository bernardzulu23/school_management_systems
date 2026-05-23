'use client'

import { useMemo, useState } from 'react'
import type { Assignment, Class, Classroom, Teacher, TimeSlot } from '@/lib/timetable/types'
import { useCollisionDetection } from '@/hooks/useCollisionDetection'
import { CollisionDetector } from '@/lib/timetable/collisionDetector'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export interface DragDropTimetableProps {
  assignments: Assignment[]
  timeSlots: TimeSlot[]
  teachers: Teacher[]
  classrooms: Classroom[]
  studentClasses: Class[]
  onAssignmentChange: (assignment: Assignment) => void
  onConflictDetected: (conflicts: Map<string, import('@/lib/timetable/types').Conflict[]>) => void
  season?: 'normal' | 'planting' | 'harvest'
}

type DragState =
  | { active: false }
  | {
      active: true
      assignmentId: Assignment['id']
      from: {
        dayOfWeek: Assignment['dayOfWeek']
        startTime: Assignment['startTime']
        endTime: Assignment['endTime']
      }
    }

type SwapState =
  | { open: false }
  | {
      open: true
      a: Assignment
      b: Assignment
      nextA: Assignment
      nextB: Assignment
    }

function slotKey(slot: Pick<TimeSlot, 'period' | 'startTime' | 'endTime' | 'isBreak'>) {
  return `${slot.period}|${slot.startTime}|${slot.endTime}|${slot.isBreak ? 1 : 0}`
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

export function DragDropTimetable(props: DragDropTimetableProps) {
  const {
    assignments,
    timeSlots,
    teachers,
    classrooms,
    studentClasses,
    onAssignmentChange,
    onConflictDetected,
    season = 'normal',
  } = props

  const [drag, setDrag] = useState<DragState>({ active: false })
  const [hoverCell, setHoverCell] = useState<{ dayOfWeek: string; key: string } | null>(null)
  const [swap, setSwap] = useState<SwapState>({ open: false })

  const { conflicts, validateAssignment, getConflictCount, getCriticalConflictCount } =
    useCollisionDetection({
      assignments,
      allTeachers: teachers,
      allClassrooms: classrooms,
      allClasses: studentClasses,
      season,
    })

  const days = useMemo(() => {
    const set = new Set<string>()
    for (const s of timeSlots) set.add(String(s.dayOfWeek))
    for (const a of assignments) set.add(String(a.dayOfWeek))
    const list = Array.from(set)
    return list.sort((a, b) => dayOrder(a) - dayOrder(b))
  }, [timeSlots, assignments])

  const gridSlots = useMemo(() => {
    const map = new Map<string, TimeSlot>()
    for (const s of timeSlots) {
      const k = slotKey(s)
      if (!map.has(k)) map.set(k, { ...s })
    }
    return Array.from(map.values()).sort((a, b) => a.period - b.period)
  }, [timeSlots])

  const assignmentById = useMemo(() => {
    const map = new Map<string, Assignment>()
    for (const a of assignments) map.set(String(a.id), a)
    return map
  }, [assignments])

  const teacherName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of teachers) map.set(String(t.id), t.fullName)
    return map
  }, [teachers])

  const className = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of studentClasses) map.set(String(c.id), c.name)
    return map
  }, [studentClasses])

  const roomName = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of classrooms) map.set(String(r.id), r.name)
    return map
  }, [classrooms])

  const subjectName = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assignments) {
      if (a.subjectId && (a as any).subjectName) {
        map.set(String(a.subjectId), String((a as any).subjectName))
      }
    }
    return map
  }, [assignments])

  const cellAssignments = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of assignments) {
      const k = `${a.dayOfWeek}|${a.period}|${a.startTime}|${a.endTime}`
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(a)
    }
    return map
  }, [assignments])

  const computeCellValidity = (dayOfWeek: string, slot: TimeSlot) => {
    if (!drag.active)
      return { valid: true, conflicts: [] as import('@/lib/timetable/types').Conflict[] }
    if (slot.isBreak)
      return { valid: false, conflicts: [] as import('@/lib/timetable/types').Conflict[] }
    const a = assignmentById.get(String(drag.assignmentId))
    if (!a) return { valid: false, conflicts: [] as import('@/lib/timetable/types').Conflict[] }
    const candidate: Assignment = {
      ...a,
      dayOfWeek: dayOfWeek as Assignment['dayOfWeek'],
      startTime: slot.startTime,
      endTime: slot.endTime,
      period: slot.period,
      isBreak: slot.isBreak,
    }
    const issues = validateAssignment(candidate)
    return { valid: issues.length === 0, conflicts: issues }
  }

  const onDragStart = (assignmentId: Assignment['id']) => {
    const a = assignmentById.get(String(assignmentId))
    if (!a) return
    setDrag({
      active: true,
      assignmentId,
      from: { dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime },
    })
  }

  const onDragEnd = () => {
    setDrag({ active: false })
    setHoverCell(null)
  }

  const validateHypothetical = (nextAssignments: Assignment[], candidate: Assignment) => {
    try {
      const detector = new CollisionDetector({
        assignments: nextAssignments,
        teachers,
        classrooms,
        classes: studentClasses,
        travelingTeacherRoutes: [],
        seasonMode: season,
      })
      return detector.validateAssignment(candidate)
    } catch {
      return []
    }
  }

  const onDropCell = (dayOfWeek: string, slot: TimeSlot) => {
    if (!drag.active) return
    const a = assignmentById.get(String(drag.assignmentId))
    if (!a) return
    const next: Assignment = {
      ...a,
      dayOfWeek: dayOfWeek as Assignment['dayOfWeek'],
      startTime: slot.startTime,
      endTime: slot.endTime,
      period: slot.period,
      isBreak: slot.isBreak,
    }
    const cellKey = `${dayOfWeek}|${slot.period}|${slot.startTime}|${slot.endTime}`
    const occupants = cellAssignments.get(cellKey) || []

    const issues = validateAssignment(next)
    if (issues.length > 0) {
      if (occupants.length === 1 && String(occupants[0].id) !== String(a.id) && !slot.isBreak) {
        const b = occupants[0]
        const nextB: Assignment = {
          ...b,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          period: a.period,
          isBreak: a.isBreak,
        }

        const hypothetical = assignments.map((x) => {
          if (String(x.id) === String(a.id)) return next
          if (String(x.id) === String(b.id)) return nextB
          return x
        })

        const aIssues = validateHypothetical(hypothetical, next)
        const bIssues = validateHypothetical(hypothetical, nextB)
        if (aIssues.length === 0 && bIssues.length === 0) {
          setSwap({ open: true, a, b, nextA: next, nextB })
          onDragEnd()
          return
        }
      }

      onConflictDetected(new Map([[String(next.id), issues]]))
      onDragEnd()
      return
    }

    onAssignmentChange(next)
    onDragEnd()
  }

  const conflictCount = getConflictCount()
  const criticalCount = getCriticalConflictCount()

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-royalPurple-text1 font-bold text-xl">Timetable</div>
          <div className="text-royalPurple-text3 text-sm">
            Drag and drop lessons. Invalid slots highlight red in real-time.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              criticalCount > 0
                ? 'border-red-500/50 text-red-400'
                : conflictCount > 0
                  ? 'border-amber-500/50 text-amber-400'
                  : 'border-emerald-500/50 text-emerald-400'
            }`}
          >
            {conflictCount} conflicts
          </span>
        </div>
      </div>

      <div className="overflow-auto border border-royalPurple-border/40 rounded-2xl bg-royalPurple-card/60 print:bg-white print:border-gray-200">
        <div className="min-w-[900px]">
          <div className="sticky top-0 z-10 bg-royalPurple-deep/95 backdrop-blur border-b border-royalPurple-border/40 print:static print:bg-white">
            <div
              className="grid"
              style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(180px, 1fr))` }}
            >
              <div className="px-4 py-3 text-xs font-semibold text-royalPurple-text3 uppercase">
                Time
              </div>
              {days.map((d) => (
                <div
                  key={d}
                  className="px-4 py-3 text-xs font-semibold text-royalPurple-text2 uppercase"
                >
                  {d}
                </div>
              ))}
            </div>
          </div>

          <div>
            {gridSlots.map((slot) => (
              <div
                key={slotKey(slot)}
                className={`grid border-b border-royalPurple-border/20 ${
                  slot.isBreak ? 'bg-royalPurple-page/50' : 'bg-transparent'
                }`}
                style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(180px, 1fr))` }}
              >
                <div className="px-4 py-3 text-sm text-royalPurple-text2">
                  <div className="font-semibold text-royalPurple-text1">
                    {slot.label || `Period ${slot.period}`}
                  </div>
                  <div className="text-xs text-royalPurple-text3">
                    {slot.startTime}–{slot.endTime}
                  </div>
                </div>

                {days.map((day) => {
                  const key = `${day}|${slot.period}|${slot.startTime}|${slot.endTime}`
                  const list = cellAssignments.get(key) || []
                  const validation = computeCellValidity(day, slot)
                  const isHover = hoverCell?.dayOfWeek === day && hoverCell?.key === key
                  const ringClass = drag.active
                    ? validation.valid
                      ? 'ring-2 ring-emerald-500/60'
                      : 'ring-2 ring-red-500/60'
                    : ''

                  return (
                    <div
                      key={key}
                      onDragOver={(e) => {
                        if (!drag.active) return
                        e.preventDefault()
                        setHoverCell({ dayOfWeek: day, key })
                      }}
                      onDragLeave={() => {
                        if (isHover) setHoverCell(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        onDropCell(day, slot)
                      }}
                      className={`px-3 py-3 min-h-[88px] border-l border-royalPurple-border/20 transition-colors ${
                        slot.isBreak ? 'opacity-60' : ''
                      } ${ringClass} ${isHover && drag.active ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex flex-col gap-2">
                        {list.map((a) => {
                          const aConflicts = conflicts.get(String(a.id)) || []
                          const hasCritical = aConflicts.some((c) => c.severity === 'critical')
                          const hasAny = aConflicts.length > 0
                          const border = hasCritical
                            ? 'border-red-500/60'
                            : hasAny
                              ? 'border-amber-500/60'
                              : 'border-emerald-500/40'

                          return (
                            <div
                              key={String(a.id)}
                              draggable={!slot.isBreak}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(a.id))
                                onDragStart(a.id)
                              }}
                              onDragEnd={onDragEnd}
                              className={`rounded-xl border ${border} bg-royalPurple-deep/60 px-3 py-2 cursor-grab active:cursor-grabbing zsms-hover-raise`}
                              title={`${className.get(String(a.classId)) || 'Class'} • ${
                                teacherName.get(String(a.teacherId)) || 'Teacher'
                              } • ${roomName.get(String(a.classroomId)) || 'Room'}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-royalPurple-text1 truncate">
                                  {subjectName.get(String(a.subjectId)) ||
                                    (a as any).subjectName ||
                                    className.get(String(a.classId)) ||
                                    'Lesson'}
                                </div>
                                <div className="text-xs text-royalPurple-text3 truncate">
                                  {className.get(String(a.classId)) || 'Class'}
                                </div>
                              </div>
                              <div className="text-xs text-royalPurple-text2 mt-1 truncate">
                                {teacherName.get(String(a.teacherId)) || 'Teacher'} •{' '}
                                {roomName.get(String(a.classroomId)) || 'Room'}
                              </div>
                              {aConflicts.length > 0 ? (
                                <div className="mt-1 text-[11px] text-amber-300">
                                  {aConflicts.length} issue(s)
                                </div>
                              ) : null}
                            </div>
                          )
                        })}

                        {drag.active &&
                        !validation.valid &&
                        isHover &&
                        validation.conflicts.length > 0 ? (
                          <div className="text-[11px] text-red-300">
                            {validation.conflicts[0]?.message || 'Invalid slot'}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={swap.open}
        onClose={() => setSwap({ open: false })}
        title="Toss-and-Swap suggestion"
        size="md"
      >
        {swap.open ? (
          <div className="space-y-4">
            <div className="text-sm text-royalPurple-text2">
              The target slot is occupied. A swap keeps the timetable valid.
            </div>
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-4">
              <div className="text-sm font-semibold text-royalPurple-text1">Swap lessons</div>
              <div className="mt-2 text-sm text-royalPurple-text2">
                Move{' '}
                <span className="font-semibold text-royalPurple-text1">
                  {className.get(String(swap.a.classId)) || 'Class'}
                </span>{' '}
                to {swap.nextA.dayOfWeek} P{swap.nextA.period}, and move{' '}
                <span className="font-semibold text-royalPurple-text1">
                  {className.get(String(swap.b.classId)) || 'Class'}
                </span>{' '}
                to {swap.nextB.dayOfWeek} P{swap.nextB.period}.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSwap({ open: false })}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!swap.open) return
                  onAssignmentChange(swap.nextB)
                  onAssignmentChange(swap.nextA)
                  setSwap({ open: false })
                }}
                className="zsms-hover-raise"
              >
                Apply swap
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
