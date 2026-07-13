'use client'

import { teacherColorFromStore } from '@/lib/timetable/uniqueTeacherColors'

export type TeacherLegendEntry = {
  id: string
  name: string
  colorHex?: string | null
}

/**
 * aSc-style teacher colour legend — name + swatch for every coloured timetable view.
 */
export function TeacherColorLegend({
  teachers,
  colorMap,
  title = 'Teachers',
  className = '',
  maxVisible = 48,
}: {
  teachers: TeacherLegendEntry[]
  colorMap?: Map<string, string> | Record<string, { colorHex?: string } | string> | null
  title?: string
  className?: string
  maxVisible?: number
}) {
  const rows = (teachers || [])
    .map((t) => ({
      id: String(t.id),
      name: String(t.name || 'Teacher').trim() || 'Teacher',
      hex:
        teacherColorFromStore(t.id, colorMap) ||
        teacherColorFromStore(t.id, { [t.id]: t.colorHex || '' }),
    }))
    .filter((t) => t.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (!rows.length) return null

  const visible = rows.slice(0, maxVisible)
  const hidden = rows.length - visible.length

  return (
    <div
      className={`rounded-lg border border-royalPurple-border/40 bg-royalPurple-card/25 px-3 py-2 print:border-gray-300 print:bg-white ${className}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-royalPurple-text3 mb-1.5 print:text-gray-600">
        {title}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {visible.map((t) => (
          <div key={t.id} className="inline-flex items-center gap-1.5 max-w-[180px]">
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0 border border-black/10"
              style={{ backgroundColor: t.hex }}
              title={t.hex}
            />
            <span
              className="text-[11px] text-royalPurple-text1 truncate print:text-gray-900"
              title={t.name}
            >
              {t.name}
            </span>
          </div>
        ))}
        {hidden > 0 ? (
          <span className="text-[11px] text-royalPurple-text3">+{hidden} more</span>
        ) : null}
      </div>
    </div>
  )
}
