'use client'

import type { Class } from '@/lib/timetable/types'

export type TimetableClassPickerProps = {
  classes: Class[]
  selectedClassId: string
  onSelectClass: (classId: string) => void
}

export function TimetableClassPicker({
  classes,
  selectedClassId,
  onSelectClass,
}: TimetableClassPickerProps) {
  const sorted = [...classes].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  )

  if (!sorted.length) {
    return <p className="text-sm text-royalPurple-text2">No classes found for this school.</p>
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Select class">
      {sorted.map((c) => {
        const id = String(c.id)
        const active = selectedClassId === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectClass(id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'border-royalPurple-accent bg-royalPurple-accent text-white'
                : 'border-royalPurple-border/50 bg-royalPurple-card/40 text-royalPurple-text2 hover:border-royalPurple-accent/50'
            }`}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
