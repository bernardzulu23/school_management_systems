'use client'

import type { Assignment } from '@/lib/timetable/types'
import { colorForTeacher } from '@/lib/timetable/colorScheme'
import { teacherDisplayName } from '@/lib/timetable/teacherDisplay'

export type ClassTimetablePeriodProps = {
  assignment?: Assignment | null
  teacherColors: Map<string, string>
  hasConflict?: boolean
  timeLabel?: string
}

export function ClassTimetablePeriod({
  assignment,
  teacherColors,
  hasConflict = false,
  timeLabel,
}: ClassTimetablePeriodProps) {
  if (!assignment) {
    return (
      <div className="flex min-h-[60px] flex-col items-center justify-center rounded-sm border border-[#ddd] bg-[#f5f5f5] px-2 py-2 text-center">
        {timeLabel ? <span className="text-[10px] text-royalPurple-text3">{timeLabel}</span> : null}
      </div>
    )
  }

  const fill = colorForTeacher(String(assignment.teacherId), teacherColors)
  const subject = (assignment as Assignment & { subjectName?: string }).subjectName || 'Subject'
  const teacherName = (assignment as Assignment & { teacherName?: string }).teacherName || 'Teacher'

  return (
    <div
      className={`flex min-h-[60px] flex-col items-center justify-center rounded-sm border px-2 py-2 text-center ${
        hasConflict ? 'ring-2 ring-red-500 ring-offset-1' : ''
      }`}
      style={{
        backgroundColor: fill,
        borderColor: hasConflict ? '#dc2626' : '#333333',
      }}
    >
      <div className="w-full text-xs font-bold text-[#1e1e1e]">{subject}</div>
      <div className="mt-0.5 w-full text-[10px] text-[#333]/80">
        {teacherDisplayName(teacherName, 'full')}
      </div>
      {timeLabel ? <div className="mt-1 text-[9px] text-[#333]/70">{timeLabel}</div> : null}
    </div>
  )
}
