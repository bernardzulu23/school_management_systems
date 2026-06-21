'use client'

import { useMemo } from 'react'
import type { Assignment, Class } from '@/lib/timetable/types'
import { filterClassesForTimetablePicker } from '@/lib/timetable/activeClasses'

export type TimetableClassPickerProps = {
  classes: Class[]
  assignments?: Assignment[]
  selectedClassId: string
  onSelectClass: (classId: string) => void
}

export function TimetableClassPicker({
  classes,
  assignments = [],
  selectedClassId,
  onSelectClass,
}: TimetableClassPickerProps) {
  const activeClasses = useMemo(
    () => filterClassesForTimetablePicker(classes, assignments),
    [classes, assignments]
  )

  const sorted = useMemo(
    () =>
      [...activeClasses].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      ),
    [activeClasses]
  )

  if (!sorted.length) {
    return (
      <p className="text-sm text-royalPurple-text2">
        No classes with timetable assignments yet. Generate or publish a timetable first.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Select class">
      {sorted.map((c) => {
        const id = String(c.id)
        const active = selectedClassId === id
        const count = Number(c.assignmentCount || 0)
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectClass(id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'border-royalPurple-accent bg-royalPurple-accent text-white'
                : 'border-royalPurple-border/50 bg-royalPurple-card/40 text-royalPurple-text2 hover:border-royalPurple-accent/50'
            }`}
          >
            <span>{c.name}</span>
            {count > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-royalPurple-accent/15 text-royalPurple-accentTx'
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
