'use client'

import { useMemo } from 'react'
import type { Assignment, Class, Teacher, TimeSlot } from '@/lib/timetable/types'
import { TimetableClassPicker } from '@/components/timetable/TimetableClassPicker'
import { TimetableClassGrid } from '@/components/timetable/TimetableClassGrid'
import { mergeTeacherColorMaps } from '@/lib/timetable/colorScheme'

export type TimetableClassViewProps = {
  classes: Class[]
  assignments: Assignment[]
  timeSlots: TimeSlot[]
  teachers: Teacher[]
  teacherColorMap?: Record<string, { colorHex?: string }>
  conflictAssignmentIds?: Set<string>
  selectedClassId: string
  onSelectClass: (classId: string) => void
  loading?: boolean
}

export function TimetableClassView({
  classes,
  assignments,
  timeSlots,
  teachers,
  teacherColorMap,
  conflictAssignmentIds,
  selectedClassId,
  onSelectClass,
  loading = false,
}: TimetableClassViewProps) {
  const teacherColors = useMemo(() => {
    const ids = [
      ...teachers.map((t) => String(t.id)),
      ...assignments.map((a) => String(a.teacherId)),
    ]
    return mergeTeacherColorMaps(ids, teacherColorMap)
  }, [assignments, teacherColorMap, teachers])

  const selectedClass = classes.find((c) => String(c.id) === String(selectedClassId))

  if (loading) {
    return (
      <div className="rounded-lg border border-royalPurple-border/40 bg-royalPurple-card/30 p-8 text-center text-sm text-royalPurple-text2">
        Loading class timetables…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <TimetableClassPicker
        classes={classes}
        assignments={assignments}
        selectedClassId={selectedClassId}
        onSelectClass={onSelectClass}
      />

      {selectedClassId ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-royalPurple-text">
              {selectedClass?.name || 'Class'} — weekly grid
            </h2>
            <p className="text-xs text-royalPurple-text3">
              Teacher colours match the master timetable legend.
            </p>
          </div>
          <TimetableClassGrid
            classId={selectedClassId}
            assignments={assignments}
            timeSlots={timeSlots}
            teacherColors={teacherColors}
            conflictAssignmentIds={conflictAssignmentIds}
          />
        </>
      ) : (
        <div className="rounded-lg border border-royalPurple-border/40 bg-royalPurple-card/30 p-8 text-center text-sm text-royalPurple-text2">
          Choose a class tab above to open its period × day grid.
        </div>
      )}
    </div>
  )
}
