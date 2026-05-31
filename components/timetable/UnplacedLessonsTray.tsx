'use client'

import { abbreviateSubject } from '@/lib/timetable/subjectAbbrev'
import { solidSubjectFill } from '@/lib/timetable/cardColors'
import type { CardColor } from '@/lib/timetable/cardColors'

export type UnplacedLesson = {
  id: string
  subjectName: string
  subjectCode?: string | null
  className: string
  teacherName?: string
  blockType?: string
  message?: string
  color?: CardColor
}

export function UnplacedLessonsTray({
  items,
  onSelect,
  compact = false,
}: {
  items: UnplacedLesson[]
  onSelect?: (item: UnplacedLesson) => void
  compact?: boolean
}) {
  return (
    <div
      className={`overflow-hidden print:hidden border border-[#9ca3af] bg-[#d1d5db] ${
        compact ? '' : 'rounded-xl border-royalPurple-border/40 bg-slate-100/80'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b border-[#9ca3af] bg-[#e5e7eb] ${
          compact ? 'px-2 py-0.5' : 'px-4 py-2'
        }`}
      >
        <div
          className={`font-semibold uppercase text-[#374151] ${
            compact ? 'text-[9px] tracking-wide' : 'text-xs tracking-wide text-royalPurple-text2'
          }`}
        >
          Unplaced
        </div>
        <div className={compact ? 'text-[9px] text-[#6b7280]' : 'text-xs text-royalPurple-text3'}>
          {items.length === 0 ? '—' : items.length}
        </div>
      </div>

      <div
        className={`overflow-auto bg-[#e5e7eb] ${compact ? 'min-h-[48px] max-h-[88px] p-1.5' : 'min-h-[72px] max-h-[140px] p-3'}`}
      >
        {items.length === 0 ? (
          <div
            className={`italic text-[#6b7280] ${compact ? 'text-[9px] px-0.5 py-1' : 'text-xs px-1 py-2 text-royalPurple-text3'}`}
          >
            {compact ? 'Empty pool' : 'Generate from allocations — no rooms in ZSMS.'}
          </div>
        ) : (
          <div className={`flex flex-wrap ${compact ? 'gap-0.5' : 'gap-2'}`}>
            {items.map((item) => {
              const abbrev = abbreviateSubject(item.subjectName, item.subjectCode)
              const solid = solidSubjectFill(item.subjectName)
              const Tag = onSelect ? 'button' : 'div'
              return (
                <Tag
                  key={item.id}
                  type={onSelect ? 'button' : undefined}
                  onClick={onSelect ? () => onSelect(item) : undefined}
                  title={
                    [item.subjectName, item.className, item.teacherName, item.message]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  className={`inline-flex items-center font-bold border border-[#6b7280] ${
                    compact
                      ? 'px-1 py-0 text-[9px] leading-tight min-h-[16px]'
                      : 'gap-1.5 rounded-md px-2 py-1 text-[11px] shadow-sm'
                  } ${onSelect ? 'hover:opacity-90 cursor-pointer' : ''}`}
                  style={{
                    background: item.color?.border || solid.fill,
                    color: solid.text,
                  }}
                >
                  {abbrev}
                  {compact ? (
                    <span className="font-normal opacity-90 ml-0.5">
                      {compactClass(item.className)}
                    </span>
                  ) : (
                    <>
                      <span className="font-normal text-royalPurple-text2">{item.className}</span>
                      {item.blockType && item.blockType !== 'single' ? (
                        <span className="text-[10px] text-royalPurple-text3 uppercase">
                          {item.blockType.slice(0, 1)}
                        </span>
                      ) : null}
                    </>
                  )}
                </Tag>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function compactClass(name: string) {
  const m = String(name || '').match(/(\d+\s*[A-Za-z]?|[A-Za-z]\d*)$/)
  return m ? m[0].replace(/\s+/g, '') : name.slice(0, 4)
}
