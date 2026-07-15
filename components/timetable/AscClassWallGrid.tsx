'use client'

import { Fragment, memo, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import type { Assignment, Class, Teacher, TimeSlot } from '@/lib/timetable/types'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { uniqueBellRows } from '@/lib/timetable/bellSchedule'
import {
  assignmentsForPrimaryCell,
  isContinuationSlot,
  rowSpanForAssignment,
} from '@/lib/timetable/gridHelpers'
import { periodTypeBadge } from '@/lib/timetable/doublePeriodUtils'
import { solidTeacherFill } from '@/lib/timetable/uniqueTeacherColors'
import { abbreviateSubject } from '@/lib/timetable/subjectAbbrev'
import { normalizeClassLabel } from '@/lib/timetable/activeClasses'
import {
  UnplacedLessonsTray,
  type UnplacedLesson,
} from '@/components/timetable/UnplacedLessonsTray'
import { TeacherColorLegend } from '@/components/timetable/TeacherColorLegend'
import { Lock } from 'lucide-react'

/** aSc Timetables–style compact cell metrics */
const GRID = {
  cellW: 22,
  cellH: 18,
  classColW: 46,
  breakW: 5,
  border: '#9ca3af',
  dayDivider: '#6b7280',
} as const

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

/** Short class label: "Form 1A" → "1A", "Grade 10B" → "10B" */
function compactClassLabel(name: string) {
  const n = String(name || '').trim()
  const m = n.match(/(\d+\s*[A-Za-z]?|[A-Za-z]\d*)$/)
  return m ? m[0].replace(/\s+/g, '') : n.length > 6 ? n.slice(0, 6) : n
}

export interface AscClassWallGridProps {
  assignments: Assignment[]
  timeSlots: TimeSlot[]
  classes: Class[]
  teachers: Teacher[]
  season?: string
  showConflicts?: boolean
  /** Confirmed server audit error count — never a local CollisionDetector total. */
  serverConflictErrors?: number
  unplacedLessons?: UnplacedLesson[]
  lockedPeriodKeys?: Set<string>
  /** Hide the unplaced-lessons tray (read-only dashboards). */
  showUnplacedTray?: boolean
  onAssignmentClick?: (assignment: Assignment) => void
  onDropUnplaced?: (payload: {
    lesson: UnplacedLesson
    classId: string
    day: string
    period: number
  }) => void
}

export const AscClassWallGrid = memo(function AscClassWallGrid(props: AscClassWallGridProps) {
  const {
    assignments = [],
    timeSlots,
    classes = [],
    teachers = [],
    season = 'normal',
    showConflicts = true,
    serverConflictErrors,
    unplacedLessons = [],
    lockedPeriodKeys,
    showUnplacedTray = true,
    onAssignmentClick,
    onDropUnplaced,
  } = props

  const storeConflicts = useTimetableStore((s) => s.conflicts)
  const storeTimeSlots = useTimetableStore((s) => s.timeSlots)
  const teacherColors = useTimetableStore((s) => s.teacherColors)

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [zoom, setZoom] = useState(100)

  const subjectMeta = useMemo(() => {
    const label = new Map<string, string>()
    const code = new Map<string, string>()
    for (const c of classes) {
      for (const s of c.subjects || []) {
        if (s?.id) {
          label.set(String(s.id), String(s.name || ''))
          if ((s as any).code) code.set(String(s.id), String((s as any).code))
        }
      }
    }
    for (const a of assignments) {
      if (a.subjectId && (a as any).subjectName) {
        label.set(String(a.subjectId), String((a as any).subjectName))
      }
    }
    return { label, code }
  }, [classes, assignments])

  const teacherName = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of teachers) m.set(String(t.id), t.fullName)
    return m
  }, [teachers])

  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter(
      (a) => a && (!a.season || a.season === season || season === 'normal')
    )
  }, [assignments, season])

  const sortedClasses = useMemo(() => {
    const byId = new Set<string>()
    const byLabel = new Set<string>()
    for (const a of filteredAssignments) {
      if (a?.classId) byId.add(String(a.classId))
      const lbl = normalizeClassLabel(String(a.className || ''))
      if (lbl) byLabel.add(lbl)
    }

    return [...classes]
      .filter((c) => {
        const id = String(c.id)
        if (byId.has(id)) return true
        const lbl = normalizeClassLabel(
          String(c.name || ''),
          (c as any).yearGroup || (c as any).year_group
        )
        return lbl && byLabel.has(lbl)
      })
      .sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      )
  }, [classes, filteredAssignments])

  const days = useMemo(() => {
    const set = new Set<string>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    for (const s of timeSlots || []) set.add(String(s.dayOfWeek))
    for (const a of assignments || []) set.add(String(a.dayOfWeek))
    return Array.from(set).sort((a, b) => dayOrder(a) - dayOrder(b))
  }, [timeSlots, assignments])

  const bellRows = useMemo(() => {
    const src = (timeSlots?.length ? timeSlots : storeTimeSlots) as TimeSlot[]
    return uniqueBellRows(src)
  }, [timeSlots, storeTimeSlots])

  const assignmentsByClass = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of filteredAssignments) {
      const id = String(a.classId)
      if (!map.has(id)) map.set(id, [])
      map.get(id)!.push(a)
    }
    return map
  }, [filteredAssignments])

  const hasLocalClashHighlight = useMemo(() => {
    if (!showConflicts) return false
    for (const a of filteredAssignments) {
      if ((storeConflicts.get(String(a.id)) || []).length) return true
    }
    return false
  }, [filteredAssignments, storeConflicts, showConflicts])

  const confirmedErrors =
    typeof serverConflictErrors === 'number' && Number.isFinite(serverConflictErrors)
      ? Math.max(0, Math.floor(serverConflictErrors))
      : null

  const cellStyle = (w: number, h = GRID.cellH) => ({
    width: w,
    minWidth: w,
    maxWidth: w,
    height: h,
    padding: 0,
    lineHeight: 1,
  })

  const renderDayCells = (classId: string, classAssignments: Assignment[]) => {
    const cells: ReactNode[] = []

    for (const day of days) {
      let isFirstColOfDay = true

      for (let i = 0; i < bellRows.length; i++) {
        const slot = bellRows[i]
        const dayStartBorder = isFirstColOfDay ? { borderLeft: `2px solid ${GRID.dayDivider}` } : {}

        if (slot.isBreak) {
          cells.push(
            <td
              key={`${classId}-${day}-break-${i}`}
              className="p-0 align-middle bg-[#d1d5db]"
              style={{
                ...cellStyle(GRID.breakW, GRID.cellH),
                borderTop: `1px solid ${GRID.border}`,
                borderRight: `1px solid ${GRID.border}`,
                borderBottom: `1px solid ${GRID.border}`,
                ...dayStartBorder,
              }}
              title={slot.label || 'Break'}
            />
          )
          isFirstColOfDay = false
          continue
        }

        if (isContinuationSlot(day, slot, classAssignments, bellRows)) {
          isFirstColOfDay = false
          continue
        }

        const primaries = assignmentsForPrimaryCell(day, slot, classAssignments)
        const a = primaries[0]
        const span = a ? rowSpanForAssignment(a, bellRows) : 1
        const w = GRID.cellW * span

        if (a) {
          const subjectId = String(a.subjectId || '')
          const subjectName =
            subjectMeta.label.get(subjectId) || (a as any).subjectName || 'Subject'
          const abbrev = abbreviateSubject(subjectName, subjectMeta.code.get(subjectId))
          const teacherHex = teacherColors[String(a.teacherId || '')]?.colorHex
          const { fill, text } = solidTeacherFill(teacherHex)
          const rowConflicts = showConflicts ? storeConflicts.get(String(a.id)) || [] : []
          const hasConflict = rowConflicts.length > 0
          const teacher = teacherName.get(String(a.teacherId))
          const lockKey = `${String(a.teacherId)}|${String(day).toLowerCase()}|${slot.period}`
          const isLocked = lockedPeriodKeys?.has(lockKey)
          const spanBadge = span > 1 ? periodTypeBadge(a.periodType, span) : ''

          cells.push(
            <td
              key={`${classId}-${day}-${slot.period}-${slot.startTime}`}
              colSpan={span}
              className="p-0 align-middle relative"
              style={{
                ...cellStyle(w, GRID.cellH),
                borderTop: `1px solid ${GRID.border}`,
                borderRight: `1px solid ${GRID.border}`,
                borderBottom: `1px solid ${GRID.border}`,
                ...dayStartBorder,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onAssignmentClick?.(a)
                  setSelectedAssignment(a)
                }}
                className="block w-full h-full m-0 p-0 border-0 cursor-pointer font-bold leading-none hover:opacity-90 relative"
                style={{
                  background: fill,
                  color: text,
                  fontSize: 9,
                  minHeight: GRID.cellH,
                  boxShadow: hasConflict ? 'inset 0 0 0 2px #d97706' : undefined,
                }}
                title={
                  hasConflict
                    ? `${[subjectName, teacher, `${day} P${slot.period}`].filter(Boolean).join(' · ')} · local clash highlight (preview)`
                    : [subjectName, teacher, `${day} P${slot.period}`].filter(Boolean).join(' · ')
                }
              >
                {abbrev}
                {spanBadge ? (
                  <span
                    className="absolute bottom-0 right-0 text-[7px] opacity-80 pr-0.5"
                    aria-label={`${spanBadge} period block`}
                  >
                    {spanBadge}
                  </span>
                ) : null}
                {isLocked ? (
                  <Lock
                    size={8}
                    className="absolute top-0 right-0 text-white/90 drop-shadow"
                    aria-label="Locked for generation"
                  />
                ) : null}
              </button>
            </td>
          )

          i += span - 1
        } else {
          const handleDrop = (e: DragEvent) => {
            e.preventDefault()
            const raw = e.dataTransfer.getData('application/zsms-unplaced')
            if (!raw || !onDropUnplaced) return
            try {
              const lesson = JSON.parse(raw) as UnplacedLesson
              onDropUnplaced({
                lesson,
                classId,
                day: String(day).toLowerCase(),
                period: slot.period,
              })
            } catch {
              /* ignore */
            }
          }

          cells.push(
            <td
              key={`${classId}-${day}-empty-${slot.period}-${i}`}
              className="p-0 align-middle bg-[#f3f4f6]"
              onDragOver={(e) => {
                if (onDropUnplaced) e.preventDefault()
              }}
              onDrop={handleDrop}
              style={{
                ...cellStyle(GRID.cellW, GRID.cellH),
                borderTop: `1px solid ${GRID.border}`,
                borderRight: `1px solid ${GRID.border}`,
                borderBottom: `1px solid ${GRID.border}`,
                ...dayStartBorder,
              }}
            />
          )
        }

        isFirstColOfDay = false
      }
    }

    return cells
  }

  const periodColumns = days.length * bellRows.length
  const scale = zoom / 100

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden text-[11px]">
        <div className="text-royalPurple-text3">
          {sortedClasses.length} classes
          {confirmedErrors != null ? (
            <>
              {' · '}
              {confirmedErrors > 0 ? (
                <span className="text-red-600 font-semibold">
                  {confirmedErrors} confirmed conflict{confirmedErrors === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="text-emerald-700">No confirmed conflicts</span>
              )}
            </>
          ) : null}
          {hasLocalClashHighlight ? (
            <span
              className="text-amber-700 ml-1"
              title="Local drag preview only — not the official count"
            >
              · clash highlights
            </span>
          ) : null}
        </div>
        <label className="inline-flex items-center gap-2 text-royalPurple-text3">
          Zoom
          <input
            type="range"
            min={70}
            max={130}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24 h-1 accent-royalPurple-accent"
          />
          <span className="w-8 text-right tabular-nums">{zoom}%</span>
        </label>
      </div>

      <div
        className="timetable-container overflow-auto bg-[#e5e7eb] border border-[#9ca3af] print:bg-white print:border-gray-400"
        style={{ maxHeight: 'min(72vh, 680px)' }}
      >
        <div
          style={{
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: 'top left',
            width: scale === 1 ? undefined : `${100 / scale}%`,
          }}
        >
          <table
            className="border-collapse bg-white"
            style={{
              tableLayout: 'fixed',
              fontSize: 9,
              minWidth: GRID.classColW + periodColumns * GRID.cellW,
            }}
          >
            <thead className="sticky top-0 z-20">
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 p-0 font-semibold text-[#374151] bg-[#d1d5db] text-left"
                  style={{
                    ...cellStyle(GRID.classColW, GRID.cellH),
                    height: GRID.cellH * 2,
                    paddingLeft: 4,
                    borderRight: `1px solid ${GRID.border}`,
                    borderBottom: `1px solid ${GRID.border}`,
                  }}
                />
                {days.map((d) => (
                  <th
                    key={d}
                    colSpan={bellRows.length}
                    className="p-0 font-bold text-[#111827] bg-[#d1d5db] text-center uppercase"
                    style={{
                      height: GRID.cellH,
                      fontSize: 9,
                      borderRight: `1px solid ${GRID.border}`,
                      borderBottom: `1px solid ${GRID.border}`,
                    }}
                  >
                    {d.slice(0, 3)}
                  </th>
                ))}
              </tr>
              <tr>
                {days.flatMap((d) =>
                  bellRows.map((slot, idx) => {
                    const dayStart = idx === 0 ? { borderLeft: `2px solid ${GRID.dayDivider}` } : {}
                    if (slot.isBreak) {
                      return (
                        <th
                          key={`${d}-b-${idx}`}
                          className="p-0 bg-[#9ca3af]"
                          style={{
                            ...cellStyle(GRID.breakW, GRID.cellH),
                            borderRight: `1px solid ${GRID.border}`,
                            borderBottom: `1px solid ${GRID.border}`,
                            ...dayStart,
                          }}
                        />
                      )
                    }
                    const periodLabel = slot.period != null ? String(slot.period) : String(idx + 1)
                    return (
                      <th
                        key={`${d}-${slot.period}-${idx}`}
                        className="p-0 font-normal text-[#4b5563] bg-[#e5e7eb] text-center"
                        style={{
                          ...cellStyle(GRID.cellW, GRID.cellH),
                          borderRight: `1px solid ${GRID.border}`,
                          borderBottom: `1px solid ${GRID.border}`,
                          ...dayStart,
                        }}
                        title={`${slot.startTime}–${slot.endTime}`}
                      >
                        {periodLabel}
                      </th>
                    )
                  })
                )}
              </tr>
            </thead>
            <tbody>
              {sortedClasses.map((cls, rowIdx) => {
                const classAssignments = assignmentsByClass.get(String(cls.id)) || []
                const gradeDivider =
                  rowIdx > 0 &&
                  String(sortedClasses[rowIdx - 1]?.name || '').replace(/\D/g, '') !==
                    String(cls.name || '').replace(/\D/g, '')

                return (
                  <Fragment key={String(cls.id)}>
                    {gradeDivider ? (
                      <tr>
                        <td
                          colSpan={1 + periodColumns}
                          className="p-0 h-[3px] bg-[#6b7280] border-0"
                        />
                      </tr>
                    ) : null}
                    <tr className="hover:brightness-[0.98]">
                      <td
                        className="sticky left-0 z-10 p-0 font-bold text-[#111827] bg-[#f9fafb] whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{
                          ...cellStyle(GRID.classColW, GRID.cellH),
                          paddingLeft: 3,
                          borderRight: `1px solid ${GRID.border}`,
                          borderBottom: `1px solid ${GRID.border}`,
                          fontSize: 9,
                        }}
                        title={cls.name}
                      >
                        {compactClassLabel(cls.name)}
                      </td>
                      {renderDayCells(String(cls.id), classAssignments)}
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <TeacherColorLegend
        teachers={teachers.map((t) => ({
          id: String(t.id),
          name: t.fullName || 'Teacher',
        }))}
        colorMap={teacherColors}
        className="print:block"
      />

      {showUnplacedTray ? (
        <UnplacedLessonsTray
          items={unplacedLessons}
          compact
          onDragStart={
            onDropUnplaced
              ? (item, e) => {
                  e.dataTransfer.setData('application/zsms-unplaced', JSON.stringify(item))
                  e.dataTransfer.effectAllowed = 'move'
                }
              : undefined
          }
        />
      ) : null}

      {selectedAssignment ? (
        <div className="border border-[#9ca3af] bg-[#f9fafb] px-2 py-1.5 text-[11px] print:hidden">
          <span className="font-bold">
            {subjectMeta.label.get(String(selectedAssignment.subjectId)) ||
              (selectedAssignment as any).subjectName}
          </span>
          <span className="text-[#4b5563]">
            {' '}
            · {
              sortedClasses.find((c) => String(c.id) === String(selectedAssignment.classId))?.name
            }{' '}
            · {teacherName.get(String(selectedAssignment.teacherId))} ·{' '}
            {String(selectedAssignment.dayOfWeek).slice(0, 3)} {selectedAssignment.startTime}
          </span>
        </div>
      ) : null}
    </div>
  )
})
