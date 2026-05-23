'use client'

import { memo, useMemo, useState } from 'react'
import type {
  Assignment,
  Class,
  Classroom,
  ColorRef,
  Conflict,
  Teacher,
  TimeSlot,
} from '@/lib/timetable/types'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
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
  showConflicts?: boolean
  editable?: boolean
  mobile?: boolean
  season?: 'normal' | 'farming' | 'planting'
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

function resolveBg(color?: ColorRef): string | undefined {
  if (!color) return undefined
  if (color.kind === 'className') return undefined
  if (color.kind === 'cssVar') return `rgba(var(${color.value}), 0.10)`
  if (color.kind === 'token') return 'rgba(124, 58, 237, 0.08)'
  if (color.kind === 'hex') return `${color.value}1A`
  return undefined
}

function resolveBorder(color?: ColorRef): string | undefined {
  if (!color) return undefined
  if (color.kind === 'cssVar') return `rgba(var(${color.value}), 0.35)`
  if (color.kind === 'token') return 'rgba(124, 58, 237, 0.25)'
  if (color.kind === 'hex') return `${color.value}66`
  return undefined
}

function toSeason(mode?: 'normal' | 'farming' | 'planting') {
  if (mode === 'farming') return 'farming'
  if (mode === 'planting') return 'planting'
  return 'normal'
}

export const MasterTimetableGrid = memo(function MasterTimetableGrid(
  props: MasterTimetableGridProps
) {
  const storeAssignments = useTimetableStore((s) => s.assignments)
  const storeConflicts = useTimetableStore((s) => s.conflicts)
  const storeSeasonMode = useTimetableStore((s) => s.currentSeason)

  const assignments = props.assignments ?? storeAssignments
  const showConflicts = props.showConflicts !== false
  const season =
    props.season || toSeason(storeSeasonMode === 'harvest' ? 'farming' : storeSeasonMode)

  const [selectedDay, setSelectedDay] = useState('monday')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)

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

  const classColor = useMemo(() => {
    const map = new Map<string, ColorRef | undefined>()
    for (const c of props.classes || []) map.set(String(c.id), (c as any).color)
    return map
  }, [props.classes])

  const days = useMemo(() => {
    const set = new Set<string>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    for (const s of props.timeSlots || []) set.add(String(s.dayOfWeek))
    for (const a of assignments || []) set.add(String(a.dayOfWeek))
    const list = Array.from(set)
    return list.sort((a, b) => dayOrder(a) - dayOrder(b))
  }, [props.timeSlots, assignments])

  const baseSlots = useMemo(() => {
    const src = props.timeSlots || []
    const map = new Map<string, TimeSlot>()
    for (const s of src) {
      const k = slotKey(s)
      if (!map.has(k)) map.set(k, { ...s, dayOfWeek: 'monday' })
    }
    return Array.from(map.values()).sort((a, b) => a.period - b.period)
  }, [props.timeSlots])

  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((a) => a && a.season === season)
  }, [assignments, season])

  const cellAssignments = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of filteredAssignments) {
      const key = `${a.dayOfWeek}|${a.startTime}|${a.endTime}|${a.period}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [filteredAssignments])

  const totalConflicts = useMemo(() => {
    let n = 0
    if (!showConflicts) return 0
    for (const v of storeConflicts.values()) n += v.length
    return n
  }, [storeConflicts, showConflicts])

  const isMobile = props.mobile || false
  const effectiveDays = isMobile ? [selectedDay] : days

  const [scrollTop, setScrollTop] = useState(0)
  const useVirtual = baseSlots.length >= 50
  const rowH = 96
  const viewportH = 680
  const start = useVirtual ? Math.max(0, Math.floor(scrollTop / rowH) - 6) : 0
  const end = useVirtual
    ? Math.min(baseSlots.length, start + Math.ceil(viewportH / rowH) + 12)
    : baseSlots.length
  const visibleSlots = useVirtual ? baseSlots.slice(start, end) : baseSlots
  const padTop = useVirtual ? start * rowH : 0
  const padBottom = useVirtual ? (baseSlots.length - end) * rowH : 0

  const onCellClick = (a: Assignment) => {
    props.onAssignmentClick?.(a)
    setSelectedAssignment(a)
  }

  const renderAssignment = (a: Assignment) => {
    const conflicts = showConflicts ? storeConflicts.get(String(a.id)) || [] : []
    const hasCritical = conflicts.some((c) => c.severity === 'critical')
    const hasAny = conflicts.length > 0
    const border = hasCritical ? '#ef4444' : hasAny ? '#f59e0b' : undefined
    const bg = resolveBg(classColor.get(String(a.classId)))
    const b = resolveBorder(classColor.get(String(a.classId)))

    return (
      <button
        key={String(a.id)}
        type="button"
        onClick={() => onCellClick(a)}
        className="w-full text-left rounded-xl px-3 py-2 border bg-royalPurple-card/70 hover:bg-royalPurple-card/85 transition-colors zsms-hover-raise"
        style={{
          borderColor: border || b || 'rgba(148, 163, 184, 0.35)',
          background: bg || undefined,
        }}
      >
        <div className="font-bold text-[13px] text-royalPurple-text1 truncate">
          {className.get(String(a.classId)) || 'Class'}
        </div>
        <div className="text-[12px] text-royalPurple-text2 truncate">
          {subjectLabel.get(String(a.subjectId)) || (a as any).subjectName || 'Subject'}
        </div>
        <div className="text-[12px] text-royalPurple-text2 truncate">
          {teacherName.get(String(a.teacherId)) || 'Teacher'}
        </div>
        {hasAny ? (
          <div className="text-[11px] mt-1" style={{ color: border }}>
            {hasCritical ? '⚠ Conflict' : '⚠ Issue'}
          </div>
        ) : null}
      </button>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-royalPurple-text1 font-bold text-xl">Master Timetable</div>
          <div className="text-royalPurple-text3 text-sm">
            {totalConflicts > 0
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
      </div>

      <div
        className="border border-royalPurple-border/40 rounded-2xl overflow-auto bg-royalPurple-card/60 print:bg-white"
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        style={{ maxHeight: useVirtual ? `${viewportH}px` : undefined }}
      >
        <div className="min-w-[900px]">
          <div className="sticky top-0 z-10 bg-royalPurple-deep/95 backdrop-blur border-b border-royalPurple-border/40 print:static print:bg-white">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `200px repeat(${effectiveDays.length}, minmax(210px, 1fr))`,
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
          </div>

          <div style={{ paddingTop: padTop, paddingBottom: padBottom }}>
            {visibleSlots.map((slot) => {
              const isBreak = Boolean(slot.isBreak)
              return (
                <div
                  key={slotKey(slot)}
                  className={`grid border-b border-royalPurple-border/20 ${isBreak ? 'bg-slate-100/70' : ''}`}
                  style={{
                    gridTemplateColumns: `200px repeat(${effectiveDays.length}, minmax(210px, 1fr))`,
                  }}
                >
                  <div className="px-4 py-3">
                    <div className="font-semibold text-royalPurple-text1 text-sm">
                      {slot.label || (isBreak ? 'BREAK' : `Period ${slot.period}`)}
                    </div>
                    <div className="text-xs text-royalPurple-text3">
                      {slot.startTime}–{slot.endTime}
                    </div>
                  </div>

                  {effectiveDays.map((day) => {
                    const key = `${day}|${slot.startTime}|${slot.endTime}|${slot.period}`
                    const list = cellAssignments.get(key) || []
                    return (
                      <div
                        key={key}
                        className={`px-3 py-3 border-l border-royalPurple-border/20 ${
                          isBreak
                            ? 'flex items-center justify-center text-xs font-bold text-slate-500'
                            : ''
                        }`}
                      >
                        {isBreak ? (
                          <div className="text-center">
                            <div>BREAK</div>
                            <div className="font-normal text-[11px]">
                              {slot.startTime}–{slot.endTime}
                            </div>
                          </div>
                        ) : list.length ? (
                          <div className="space-y-2">{list.map(renderAssignment)}</div>
                        ) : (
                          <div className="text-xs text-royalPurple-text3">—</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-royalPurple-text2 print:hidden">
        <span className="font-semibold">Legend:</span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 border border-slate-300" />{' '}
          Break
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-red-500" /> Conflict
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-amber-500" /> Issue
        </span>
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
    </div>
  )
})
