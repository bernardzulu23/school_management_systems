'use client'

import { useMemo } from 'react'
import type { Assignment, TimeSlot } from '@/lib/timetable/types'
import { uniqueBellRows } from '@/lib/timetable/bellSchedule'
import { ClassTimetablePeriod } from '@/components/timetable/ClassTimetablePeriod'
import { CLASS_VIEW_DAYS, buildClassAssignmentGrid } from '@/lib/timetable/classViewGrid'

export type TimetableClassGridProps = {
  classId: string
  assignments: Assignment[]
  timeSlots: TimeSlot[]
  teacherColors: Map<string, string>
  conflictAssignmentIds?: Set<string>
}

export function TimetableClassGrid({
  classId,
  assignments,
  timeSlots,
  teacherColors,
  conflictAssignmentIds,
}: TimetableClassGridProps) {
  const bellRows = useMemo(
    () => uniqueBellRows(timeSlots as Parameters<typeof uniqueBellRows>[0]),
    [timeSlots]
  )

  const grid = useMemo(
    () => buildClassAssignmentGrid(classId, assignments, timeSlots),
    [assignments, classId, timeSlots]
  )

  const teachingRows = useMemo(() => {
    if (bellRows.length) return bellRows
    return Array.from({ length: 9 }, (_, i) => ({
      period: i + 1,
      startTime: '',
      endTime: '',
      isBreak: false,
      dayOfWeek: 'monday',
    }))
  }, [bellRows])

  if (!classId) {
    return (
      <div className="rounded-lg border border-royalPurple-border/40 bg-royalPurple-card/30 p-8 text-center text-sm text-royalPurple-text2">
        Select a class to view its timetable.
      </div>
    )
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border border-[#ddd] bg-[#ddd] p-px text-xs"
      style={{
        display: 'grid',
        gridTemplateColumns: '100px repeat(5, minmax(120px, 1fr))',
        gap: '1px',
      }}
    >
      <div className="bg-[#f0f0f0] p-2.5 text-center font-bold text-[#374151]" />
      {CLASS_VIEW_DAYS.map((d) => (
        <div
          key={d.key}
          className="bg-[#e8e8e8] p-2.5 text-center text-xs font-bold text-[#374151]"
        >
          {d.key}
        </div>
      ))}

      {teachingRows.map((row) => {
        if (row.isBreak) {
          return (
            <div key={`break-${row.startTime}-${row.endTime}`} className="contents">
              <div className="col-span-6 bg-amber-50 px-2 py-1.5 text-center text-[11px] font-semibold text-amber-900">
                Break {row.startTime && row.endTime ? `${row.startTime} – ${row.endTime}` : ''}
              </div>
            </div>
          )
        }

        const period = Number(row.period) || 0
        return (
          <div key={`period-${period}-${row.startTime}`} className="contents">
            <div className="flex items-center justify-center bg-[#f0f0f0] px-2 py-2 text-center text-[11px] font-bold text-[#374151]">
              Period {period}
              {row.startTime && row.endTime ? (
                <span className="mt-0.5 block text-[9px] font-normal text-[#6b7280]">
                  {row.startTime}–{row.endTime}
                </span>
              ) : null}
            </div>
            {CLASS_VIEW_DAYS.map((d) => {
              const assignment = grid.get(`${period}|${d.key}`) || null
              const hasConflict = assignment
                ? Boolean(conflictAssignmentIds?.has(String(assignment.id)))
                : false
              return (
                <ClassTimetablePeriod
                  key={`${period}|${d.key}`}
                  assignment={assignment}
                  teacherColors={teacherColors}
                  hasConflict={hasConflict}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
