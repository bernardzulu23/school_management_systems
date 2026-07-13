'use client'

import { Fragment, memo, useCallback, useMemo, useState } from 'react'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import type { Assignment, Class, Classroom, Teacher, TimeSlot } from '@/lib/timetable/types'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { uniqueBellRows, type BellScheduleSlot } from '@/lib/timetable/bellSchedule'
import { countUniqueConflicts } from '@/lib/timetable/conflictDedupe'
import { buildTeacherColorMap } from '@/lib/timetable/teacherColorPalette'
import { TeacherColorLegend } from '@/components/timetable/TeacherColorLegend'
import {
  assignmentsForPrimaryCell,
  isContinuationSlot,
  rowSpanForAssignment,
} from '@/lib/timetable/gridHelpers'
import {
  dropTargetId,
  planDropFromId,
  type DragDropDetectorContext,
  type DropPlan,
} from '@/lib/timetable/dragDropHelpers'
import { TimetableDndProvider } from '@/components/timetable/dnd/TimetableDndProvider'
import {
  AssignmentCardOverlay,
  DraggableAssignmentCard,
} from '@/components/timetable/dnd/DraggableAssignmentCard'
import { DroppableGridCell } from '@/components/timetable/dnd/DroppableGridCell'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export interface MasterTimetableGridProps {
  assignments?: Assignment[]
  timeSlots?: TimeSlot[]
  classes?: Class[]
  teachers?: Teacher[]
  classrooms?: Classroom[]
  onAssignmentClick?: (assignment: Assignment) => void
  onDeleteAssignment?: (assignmentId: Assignment['id']) => void
  onAssignmentChange?: (assignment: Assignment) => void | Promise<void>
  onSwapAssignments?: (a: Assignment, b: Assignment) => void | Promise<void>
  onConflictDetected?: (conflicts: Map<string, import('@/lib/timetable/types').Conflict[]>) => void
  showConflicts?: boolean
  editable?: boolean
  enableDragDrop?: boolean
  mobile?: boolean
  season?: 'normal' | 'farming' | 'planting'
  compactHeader?: boolean
}

const ROW_H = 52

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

function slotKey(slot: Pick<BellScheduleSlot, 'period' | 'startTime' | 'endTime' | 'isBreak'>) {
  return `${slot.period}|${slot.startTime}|${slot.endTime}|${slot.isBreak ? 1 : 0}`
}

function toSeason(mode?: 'normal' | 'farming' | 'planting') {
  if (mode === 'farming') return 'farming'
  if (mode === 'planting') return 'planting'
  return 'normal'
}

function toDetectorSeason(season: string): DragDropDetectorContext['seasonMode'] {
  if (season === 'planting') return 'planting'
  if (season === 'farming') return 'harvest'
  return 'normal'
}

type SwapState =
  | { open: false }
  | { open: true; nextA: Assignment; nextB: Assignment; a: Assignment; b: Assignment }

export const MasterTimetableGrid = memo(function MasterTimetableGrid(
  props: MasterTimetableGridProps
) {
  const storeAssignments = useTimetableStore((s) => s.assignments)
  const storeConflicts = useTimetableStore((s) => s.conflicts)
  const storeSeasonMode = useTimetableStore((s) => s.currentSeason)
  const storeTimeSlots = useTimetableStore((s) => s.timeSlots)
  const teacherColors = useTimetableStore((s) => s.teacherColors)

  const assignments = props.assignments ?? storeAssignments
  const showConflicts = props.showConflicts !== false
  const season =
    props.season || toSeason(storeSeasonMode === 'harvest' ? 'farming' : storeSeasonMode)
  const dragEnabled = Boolean(props.enableDragDrop && props.editable && props.onAssignmentChange)

  const [selectedDay, setSelectedDay] = useState('monday')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [hoverDropId, setHoverDropId] = useState<string | null>(null)
  const [swap, setSwap] = useState<SwapState>({ open: false })

  const teacherColorMap = useMemo(
    () =>
      buildTeacherColorMap(
        (props.teachers || []).map((t) => String(t.id)),
        teacherColors
      ),
    [props.teachers, teacherColors]
  )

  const teacherName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of props.teachers || []) map.set(String(t.id), t.fullName)
    return map
  }, [props.teachers])

  const className = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of props.classes || []) map.set(String(c.id), c.name)
    return map
  }, [props.classes])

  const subjectLabel = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assignments || []) {
      if (a.subjectId && (a as any).subjectName) {
        map.set(String(a.subjectId), String((a as any).subjectName))
      }
    }
    return map
  }, [assignments])

  const days = useMemo(() => {
    const set = new Set<string>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    for (const s of props.timeSlots || []) set.add(String(s.dayOfWeek))
    for (const a of assignments || []) set.add(String(a.dayOfWeek))
    return Array.from(set).sort((a, b) => dayOrder(a) - dayOrder(b))
  }, [props.timeSlots, assignments])

  const baseSlots = useMemo((): BellScheduleSlot[] => {
    const src = (props.timeSlots?.length ? props.timeSlots : storeTimeSlots) as BellScheduleSlot[]
    return uniqueBellRows(src).map((s) => ({
      ...s,
      dayOfWeek: 'monday',
    }))
  }, [props.timeSlots, storeTimeSlots])

  const filteredAssignments = useMemo(() => {
    const list = assignments || []
    if (props.assignments) return list
    return list.filter((a) => {
      if (!a) return false
      if (season === 'normal') return !a.season || a.season === 'normal'
      return a.season === season
    })
  }, [assignments, season, props.assignments])

  const cellAssignments = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of filteredAssignments) {
      for (const slot of baseSlots) {
        if (slot.isBreak) continue
        if (!assignmentsForPrimaryCell(String(a.dayOfWeek), slot, [a]).length) continue
        const key = `${a.dayOfWeek}|${slot.startTime}|${slot.endTime}|${slot.period}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(a)
      }
    }
    return map
  }, [filteredAssignments, baseSlots])

  const assignmentById = useMemo(() => {
    const map = new Map<string, Assignment>()
    for (const a of filteredAssignments) map.set(String(a.id), a)
    return map
  }, [filteredAssignments])

  const detectorCtx = useMemo(
    (): DragDropDetectorContext => ({
      teachers: props.teachers || [],
      classrooms: props.classrooms || [],
      classes: props.classes || [],
      timeSlots: (props.timeSlots || storeTimeSlots) as TimeSlot[],
      seasonMode: toDetectorSeason(season),
    }),
    [props.teachers, props.classrooms, props.classes, props.timeSlots, storeTimeSlots, season]
  )

  const totalConflicts = useMemo(() => {
    if (!showConflicts) return 0
    return countUniqueConflicts(storeConflicts)
  }, [storeConflicts, showConflicts])

  const isMobile = props.mobile || false
  const effectiveDays = isMobile ? [selectedDay] : days

  const [scrollTop, setScrollTop] = useState(0)
  const useVirtual = baseSlots.length >= 50
  const viewportH = 680
  const start = useVirtual ? Math.max(0, Math.floor(scrollTop / ROW_H) - 6) : 0
  const end = useVirtual
    ? Math.min(baseSlots.length, start + Math.ceil(viewportH / ROW_H) + 12)
    : baseSlots.length
  const visibleSlots = useVirtual ? baseSlots.slice(start, end) : baseSlots
  const padTop = useVirtual ? start * ROW_H : 0
  const padBottom = useVirtual ? (baseSlots.length - end) * ROW_H : 0

  const computeDropPlan = useCallback(
    (draggedId: string | null, dropId: string | null): DropPlan | null => {
      if (!draggedId || !dropId) return null
      return planDropFromId({
        draggedId,
        dropId,
        assignments: filteredAssignments,
        bellRows: baseSlots,
        ctx: detectorCtx,
      })
    },
    [filteredAssignments, baseSlots, detectorCtx]
  )

  const hoverPlan = useMemo(
    () => (activeDragId && hoverDropId ? computeDropPlan(activeDragId, hoverDropId) : null),
    [activeDragId, hoverDropId, computeDropPlan]
  )

  const onCellClick = (a: Assignment) => {
    props.onAssignmentClick?.(a)
    setSelectedAssignment(a)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null
    setHoverDropId(overId)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const draggedId = event.active?.id ? String(event.active.id) : null
    const dropId = event.over?.id ? String(event.over.id) : null
    setActiveDragId(null)
    setHoverDropId(null)

    if (!draggedId || !dropId || !props.onAssignmentChange) return

    const plan = computeDropPlan(draggedId, dropId)
    if (!plan || plan.kind === 'noop') return

    if (plan.kind === 'move') {
      await props.onAssignmentChange(plan.nextA)
      return
    }

    if (plan.kind === 'swap') {
      const a = assignmentById.get(draggedId)
      const occupants = assignmentsForPrimaryCell(
        plan.nextA.dayOfWeek,
        baseSlots.find(
          (s) =>
            !s.isBreak && s.period === plan.nextA.period && s.startTime === plan.nextA.startTime
        ) || baseSlots[0],
        filteredAssignments
      ).filter((x) => String(x.id) !== draggedId)
      const b = occupants[0]
      if (b) {
        setSwap({ open: true, nextA: plan.nextA, nextB: plan.nextB, a: a!, b })
      }
      return
    }

    if (plan.kind === 'invalid' && plan.conflicts.length) {
      props.onConflictDetected?.(new Map([[draggedId, plan.conflicts]]))
    }
  }

  const handleDragCancel = () => {
    setActiveDragId(null)
    setHoverDropId(null)
  }

  const cardLabel = (a: Assignment) => {
    const cls = className.get(String(a.classId)) || 'Class'
    const sub = subjectLabel.get(String(a.subjectId)) || (a as any).subjectName || 'Subject'
    return `${cls} · ${sub}`
  }

  const cardTooltip = (a: Assignment) => {
    const teacher = teacherName.get(String(a.teacherId)) || 'Teacher'
    const cls = className.get(String(a.classId)) || 'Class'
    const sub = subjectLabel.get(String(a.subjectId)) || (a as any).subjectName || 'Subject'
    return `${cls} · ${sub} · ${teacher} · ${a.dayOfWeek} ${a.startTime}–${a.endTime}`
  }

  const renderAssignment = (a: Assignment, slotRowSpan = 1) => {
    const conflicts = showConflicts ? storeConflicts.get(String(a.id)) || [] : []
    const hasCritical = conflicts.some((c) => c.severity === 'critical')
    const hasAny = conflicts.length > 0
    const border = hasCritical ? '#ef4444' : hasAny ? '#f59e0b' : undefined
    const hex =
      teacherColorMap.get(String(a.teacherId)) ||
      teacherColors[String(a.teacherId || '')]?.colorHex ||
      '#90A4AE'
    const teacherStyle = {
      backgroundColor: `${hex}22`,
      borderLeft: `3px solid ${hex}`,
    }
    const span = slotRowSpan > 1 ? slotRowSpan : rowSpanForAssignment(a, baseSlots)
    const label = cardLabel(a)

    if (dragEnabled) {
      return (
        <DraggableAssignmentCard
          key={String(a.id)}
          assignment={a}
          label={label}
          span={span}
          borderColor={border}
          cardBg={teacherStyle.backgroundColor}
          cardBorder={hex}
          hasConflict={hasAny}
          tooltip={cardTooltip(a)}
          onClick={() => onCellClick(a)}
        />
      )
    }

    return (
      <button
        key={String(a.id)}
        type="button"
        onClick={() => onCellClick(a)}
        className="w-full h-full text-left rounded-lg px-2 py-1 border hover:opacity-95 transition-colors zsms-hover-raise relative z-[1] text-[11px] leading-tight"
        style={{
          borderColor: border || hex,
          background: teacherStyle.backgroundColor,
          borderLeft: teacherStyle.borderLeft,
        }}
        title={cardTooltip(a)}
      >
        <span className="font-semibold text-royalPurple-text1 truncate block">{label}</span>
      </button>
    )
  }

  const activeDragAssignment = activeDragId ? assignmentById.get(activeDragId) : null
  const activeOverlayLabel = activeDragAssignment ? cardLabel(activeDragAssignment) : ''
  const activeOverlayColors = activeDragAssignment
    ? (() => {
        const hex =
          teacherColorMap.get(String(activeDragAssignment.teacherId)) ||
          teacherColors[String(activeDragAssignment.teacherId || '')]?.colorHex ||
          '#90A4AE'
        return { bg: `${hex}22`, border: hex }
      })()
    : null

  const gridBody = (
    <div
      className="timetable-container border border-royalPurple-border/40 rounded-2xl overflow-auto bg-royalPurple-card/60 print:bg-white min-w-0"
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ maxHeight: useVirtual ? `${viewportH}px` : undefined }}
    >
      <div className="min-w-[900px]">
        <div className="sticky top-0 z-10 bg-royalPurple-deep/95 backdrop-blur border-b border-royalPurple-border/40 print:static print:bg-white">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `160px repeat(${effectiveDays.length}, minmax(160px, 1fr))`,
            }}
          >
            <div className="px-3 py-2 text-xs font-semibold text-royalPurple-text3 uppercase">
              Time
            </div>
            {effectiveDays.map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-xs font-semibold text-royalPurple-text2 uppercase"
              >
                {d.slice(0, 3)}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `160px repeat(${effectiveDays.length}, minmax(160px, 1fr))`,
            gridAutoRows: `${ROW_H}px`,
            paddingTop: padTop,
            paddingBottom: padBottom,
          }}
        >
          {visibleSlots.map((slot, rowIndex) => {
            const isBreak = Boolean(slot.isBreak)
            const gridRow = rowIndex + 1

            return (
              <Fragment key={slotKey(slot)}>
                <div
                  className={`px-3 py-1 border-b border-r flex flex-col justify-center ${
                    isBreak
                      ? 'bg-slate-100/70 border-royalPurple-border/40'
                      : 'border-royalPurple-border/10'
                  }`}
                  style={{ gridRow, gridColumn: 1, minHeight: ROW_H }}
                >
                  <div className="font-semibold text-royalPurple-text1 text-xs truncate">
                    {slot.label || (isBreak ? 'BREAK' : `P${slot.period}`)}
                  </div>
                  <div className="text-[10px] text-royalPurple-text3">
                    {slot.startTime}–{slot.endTime}
                  </div>
                </div>

                {isBreak ? (
                  <div
                    className="px-2 border-b border-royalPurple-border/40 flex items-center justify-center text-[10px] font-semibold text-royalPurple-text3 uppercase tracking-widest bg-slate-100/70"
                    style={{
                      gridRow,
                      gridColumn: `2 / span ${effectiveDays.length}`,
                      minHeight: ROW_H,
                    }}
                  >
                    {slot.label || 'Break / Lunch'}
                  </div>
                ) : (
                  effectiveDays.map((day, dayIndex) => {
                    const key = `${day}|${slot.startTime}|${slot.endTime}|${slot.period}`
                    const list = cellAssignments.get(key) || []
                    const continued =
                      list.length === 0 &&
                      isContinuationSlot(day, slot, filteredAssignments, baseSlots)
                    if (continued) return null

                    const maxSpan = list.length
                      ? Math.max(...list.map((a) => rowSpanForAssignment(a, baseSlots)))
                      : 1
                    const gridColumn = dayIndex + 2
                    const cellDropId = dropTargetId(day, slot)
                    const isHover = hoverDropId === cellDropId
                    let dropValidity: 'neutral' | 'valid' | 'invalid' = 'neutral'
                    if (activeDragId && isHover && hoverPlan) {
                      if (hoverPlan.kind === 'move' || hoverPlan.kind === 'swap') {
                        dropValidity = 'valid'
                      } else if (hoverPlan.kind === 'invalid') {
                        dropValidity = 'invalid'
                      }
                    }

                    const cellInner = (
                      <>
                        {list.length ? (
                          <div className="flex flex-col gap-1 flex-1 h-full min-h-0">
                            {list.map((a) =>
                              renderAssignment(a, rowSpanForAssignment(a, baseSlots))
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-royalPurple-text3">—</div>
                        )}
                        {activeDragId &&
                        isHover &&
                        hoverPlan?.kind === 'invalid' &&
                        hoverPlan.conflicts.length > 0 ? (
                          <div className="text-[10px] text-red-400 truncate">
                            {hoverPlan.conflicts[0]?.message || 'Invalid slot'}
                          </div>
                        ) : null}
                      </>
                    )

                    if (dragEnabled) {
                      return (
                        <DroppableGridCell
                          key={key}
                          id={cellDropId}
                          disabled={isBreak}
                          dropValidity={dropValidity}
                          isHover={isHover}
                          className="px-2 py-1 border-b border-l border-royalPurple-border/10 relative overflow-visible flex flex-col min-h-0"
                          style={{
                            gridRow: maxSpan > 1 ? `${gridRow} / span ${maxSpan}` : gridRow,
                            gridColumn,
                            minHeight: ROW_H * maxSpan,
                          }}
                        >
                          {cellInner}
                        </DroppableGridCell>
                      )
                    }

                    return (
                      <div
                        key={key}
                        className="px-2 py-1 border-b border-l border-royalPurple-border/10 relative overflow-visible flex flex-col"
                        style={{
                          gridRow: maxSpan > 1 ? `${gridRow} / span ${maxSpan}` : gridRow,
                          gridColumn,
                          minHeight: ROW_H * maxSpan,
                        }}
                      >
                        {cellInner}
                      </div>
                    )
                  })
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-full min-w-0">
      {props.compactHeader && dragEnabled ? (
        <div className="mb-3 text-sm text-royalPurple-text3 print:hidden">
          Drag lessons between cells. Valid targets show a{' '}
          <span className="text-emerald-400 font-medium">green</span> ring; invalid slots show{' '}
          <span className="text-red-400 font-medium">red</span>.
        </div>
      ) : null}
      {!props.compactHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
          <div>
            <div className="text-royalPurple-text1 font-bold text-xl">Master Timetable</div>
            <div className="text-royalPurple-text3 text-sm">
              {dragEnabled
                ? 'Drag and drop lessons. Invalid slots highlight red in real-time.'
                : totalConflicts > 0
                  ? `${totalConflicts} conflict(s) detected`
                  : 'No conflicts detected'}
            </div>
          </div>
          {isMobile ? (
            <div className="flex items-center gap-2">
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
          {dragEnabled ? (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                totalConflicts > 0
                  ? 'border-amber-500/50 text-amber-400'
                  : 'border-emerald-500/50 text-emerald-400'
              }`}
            >
              {totalConflicts} conflicts
            </span>
          ) : null}
        </div>
      ) : null}

      {dragEnabled ? (
        <TimetableDndProvider
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          overlay={
            activeDragAssignment ? (
              <AssignmentCardOverlay
                label={activeOverlayLabel}
                cardBg={activeOverlayColors?.bg}
                cardBorder={activeOverlayColors?.border}
              />
            ) : null
          }
        >
          {gridBody}
        </TimetableDndProvider>
      ) : (
        gridBody
      )}

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-royalPurple-text2 print:hidden">
          <span className="font-semibold">Legend:</span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 border border-slate-300" />{' '}
            Break
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-red-500" /> Conflict
          </span>
          {dragEnabled ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm ring-2 ring-emerald-500" /> Valid
              drop
            </span>
          ) : null}
        </div>
        {(props.teachers || []).length > 0 ? (
          <TeacherColorLegend
            teachers={(props.teachers || []).map((t) => ({
              id: String(t.id),
              name: t.fullName || 'Teacher',
            }))}
            colorMap={teacherColors}
          />
        ) : null}
      </div>

      <Modal
        isOpen={Boolean(selectedAssignment)}
        onClose={() => setSelectedAssignment(null)}
        title="Assignment Details"
        size="md"
      >
        {selectedAssignment ? (
          <div className="space-y-3 text-sm">
            <div className="onboard-summary">
              <span className="onboard-summary-title">Class</span>
              <span className="onboard-summary-meta">
                {className.get(String(selectedAssignment.classId)) || '—'}
              </span>
            </div>
            <div className="onboard-summary">
              <span className="onboard-summary-title">Teacher</span>
              <span className="onboard-summary-meta">
                {teacherName.get(String(selectedAssignment.teacherId)) || '—'}
              </span>
            </div>
            <div className="onboard-summary">
              <span className="onboard-summary-title">Subject</span>
              <span className="onboard-summary-meta">
                {subjectLabel.get(String(selectedAssignment.subjectId)) ||
                  (selectedAssignment as any).subjectName ||
                  '—'}
              </span>
            </div>
            <div className="onboard-summary">
              <span className="onboard-summary-title">Time</span>
              <span className="onboard-summary-meta">
                {selectedAssignment.dayOfWeek} {selectedAssignment.startTime}–
                {selectedAssignment.endTime}
              </span>
            </div>
            <div className="onboard-summary">
              <span className="onboard-summary-title">Season</span>
              <span className="onboard-summary-meta">{selectedAssignment.season}</span>
            </div>
            {props.editable && props.onDeleteAssignment ? (
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const ok = window.confirm('Delete this timetable entry?')
                    if (!ok) return
                    props.onDeleteAssignment?.(selectedAssignment.id)
                    setSelectedAssignment(null)
                  }}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={swap.open}
        onClose={() => setSwap({ open: false })}
        title="Swap lessons"
        size="md"
      >
        {swap.open ? (
          <div className="space-y-4">
            <div className="text-sm text-royalPurple-text2">
              The target slot is occupied. Apply this swap to keep the timetable valid.
            </div>
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-4 text-sm text-royalPurple-text2">
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
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSwap({ open: false })}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!swap.open) return
                  if (props.onSwapAssignments) {
                    await props.onSwapAssignments(swap.nextA, swap.nextB)
                  } else if (props.onAssignmentChange) {
                    await props.onAssignmentChange(swap.nextB)
                    await props.onAssignmentChange(swap.nextA)
                  }
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
})
