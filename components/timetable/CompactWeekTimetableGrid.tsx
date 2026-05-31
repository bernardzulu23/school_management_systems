'use client'

import { useMemo } from 'react'
import type { Assignment, TimeSlot } from '@/lib/timetable/types'
import { uniqueBellRows } from '@/lib/timetable/bellSchedule'
import {
  assignmentsForPrimaryCell,
  isContinuationSlot,
  rowSpanForAssignment,
} from '@/lib/timetable/gridHelpers'
import { resolveCardColor } from '@/lib/timetable/cardColors'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { teacherDisplayName } from '@/lib/timetable/teacherDisplay'

const DAYS = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
]

export type CompactWeekTimetableGridProps = {
  assignments: Assignment[]
  timeSlots: TimeSlot[]
  /** Hide teacher line on cards (student privacy mode). */
  hideTeacher?: boolean
  emptyMessage?: string
}

export function CompactWeekTimetableGrid({
  assignments,
  timeSlots,
  hideTeacher = false,
  emptyMessage = 'No published timetable yet. Ask your headteacher to publish the master timetable.',
}: CompactWeekTimetableGridProps) {
  const getTeacherColorHex = useTimetableStore((s) => s.getTeacherColorHex)

  const bellRows = useMemo(() => uniqueBellRows(timeSlots || []), [timeSlots])

  if (!assignments.length) {
    return (
      <div className="rounded-lg border border-[#9ca3af] bg-[#f9fafb] p-8 text-center text-sm text-[#4b5563]">
        {emptyMessage}
      </div>
    )
  }

  if (!bellRows.length) {
    return (
      <div className="rounded-lg border border-[#9ca3af] bg-[#f9fafb] p-8 text-center text-sm text-[#4b5563]">
        School bell schedule is not configured yet.
      </div>
    )
  }

  return (
    <div className="timetable-container overflow-x-auto rounded-lg border border-[#9ca3af] bg-white">
      <table className="min-w-[640px] w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#e5e7eb]">
            <th className="sticky left-0 z-10 bg-[#e5e7eb] px-2 py-1.5 text-left font-semibold text-[#374151] border-b border-[#9ca3af]">
              Time
            </th>
            {DAYS.map((d, idx) => (
              <th
                key={d.key}
                className={`px-2 py-1.5 text-center font-semibold text-[#374151] border-b border-[#9ca3af] ${
                  idx > 0 ? 'border-l border-[#9ca3af]' : ''
                }`}
              >
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bellRows.map((slot, rowIdx) => {
            const slotKey = `${slot.isBreak ? 'b' : 'p'}-${slot.startTime}-${slot.endTime}`
            const nextSlot = bellRows[rowIdx + 1]
            const blockEnd =
              slot.isBreak || (nextSlot && nextSlot.isBreak) || rowIdx === bellRows.length - 1

            if (slot.isBreak) {
              return (
                <tr key={slotKey} className="bg-[#d1d5db]">
                  <td className="sticky left-0 z-10 bg-[#d1d5db] px-2 py-1 text-[#374151] whitespace-nowrap font-medium border-b border-[#9ca3af]">
                    {slot.startTime}–{slot.endTime}
                  </td>
                  <td
                    colSpan={DAYS.length}
                    className="px-2 py-1 text-center text-[#4b5563] font-semibold uppercase tracking-widest border-b border-[#9ca3af]"
                  >
                    {slot.label || 'Break'}
                  </td>
                </tr>
              )
            }

            return (
              <tr key={slotKey}>
                <td
                  className={`sticky left-0 z-10 bg-[#f9fafb] px-2 py-1 text-[#4b5563] whitespace-nowrap border-b ${
                    blockEnd ? 'border-[#9ca3af]' : 'border-[#e5e7eb]'
                  }`}
                >
                  {slot.startTime}–{slot.endTime}
                </td>
                {DAYS.map((d, dayIdx) => {
                  if (isContinuationSlot(d.key, slot, assignments, bellRows)) {
                    return null
                  }
                  const primary = assignmentsForPrimaryCell(d.key, slot, assignments)
                  const a = primary[0]
                  const span = a ? rowSpanForAssignment(a, bellRows) : 1
                  const colors = a
                    ? resolveCardColor(
                        a.subjectId,
                        a.teacherId,
                        getTeacherColorHex(String(a.teacherId || ''))
                      )
                    : null

                  return (
                    <td
                      key={d.key}
                      rowSpan={span > 1 ? span : undefined}
                      className={`px-1 py-0.5 align-top border-b ${
                        blockEnd ? 'border-[#9ca3af]' : 'border-[#e5e7eb]'
                      } ${dayIdx > 0 ? 'border-l border-[#d1d5db]' : ''}`}
                    >
                      {a ? (
                        <div
                          className="rounded px-1.5 py-1 min-h-[36px] border"
                          style={{
                            backgroundColor: colors?.bg,
                            borderColor: colors?.border,
                          }}
                        >
                          <div className="font-bold text-[#111827] truncate text-[11px] leading-tight">
                            {(a as any).subjectName || a.subjectId}
                          </div>
                          {!hideTeacher ? (
                            <div className="text-[10px] text-[#4b5563] truncate leading-tight">
                              {(a as any).className || a.classId} ·{' '}
                              {teacherDisplayName(
                                (a as any).teacherName || String(a.teacherId),
                                'initials'
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[#d1d5db] select-none">·</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
