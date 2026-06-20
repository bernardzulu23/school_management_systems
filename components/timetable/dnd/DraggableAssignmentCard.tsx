'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Assignment } from '@/lib/timetable/types'
import { resolveCardColor } from '@/lib/timetable/cardColors'
import { periodTypeBadge } from '@/lib/timetable/doublePeriodUtils'

export interface DraggableAssignmentCardProps {
  assignment: Assignment
  disabled?: boolean
  label: string
  badge?: string
  span?: number
  borderColor?: string
  cardBg?: string
  cardBorder?: string
  hasConflict?: boolean
  tooltip?: string
  onClick?: () => void
}

export function DraggableAssignmentCard({
  assignment,
  disabled,
  label,
  badge,
  span = 1,
  borderColor,
  cardBg,
  cardBorder,
  hasConflict,
  tooltip,
  onClick,
}: DraggableAssignmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(assignment.id),
    disabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
    borderColor: borderColor || cardBorder,
    background: cardBg,
  }

  const periodBadge =
    badge || (span > 1 ? periodTypeBadge((assignment as any).periodType, span) : '')

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-full text-left rounded-lg px-2 py-1 border text-[11px] leading-tight zsms-hover-raise relative z-[1] truncate ${
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${hasConflict ? '' : ''}`}
      style={style}
      title={tooltip}
    >
      <span className="font-semibold text-royalPurple-text1 truncate block">
        {label}
        {periodBadge ? (
          <span className="ml-1 text-[9px] font-semibold opacity-70">{periodBadge}</span>
        ) : null}
      </span>
    </button>
  )
}

export function AssignmentCardOverlay({
  label,
  cardBg,
  cardBorder,
}: {
  label: string
  cardBg?: string
  cardBorder?: string
}) {
  return (
    <div
      className="rounded-lg px-2 py-1 border text-[11px] font-semibold text-royalPurple-text1 shadow-lg cursor-grabbing"
      style={{ background: cardBg, borderColor: cardBorder }}
    >
      {label}
    </div>
  )
}

export function resolveAssignmentCardColors(assignment: Assignment, teacherColorHex?: string) {
  return resolveCardColor(assignment.subjectId, assignment.teacherId, teacherColorHex)
}
