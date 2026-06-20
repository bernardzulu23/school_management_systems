'use client'

import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

export type DropValidity = 'neutral' | 'valid' | 'invalid'

export interface DroppableGridCellProps {
  id: string
  disabled?: boolean
  dropValidity?: DropValidity
  isHover?: boolean
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}

export function DroppableGridCell({
  id,
  disabled,
  dropValidity = 'neutral',
  isHover,
  className = '',
  style,
  children,
}: DroppableGridCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled })

  const ringClass =
    !disabled && dropValidity === 'valid'
      ? 'ring-2 ring-emerald-500/70'
      : !disabled && dropValidity === 'invalid'
        ? 'ring-2 ring-red-500/70'
        : ''

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${ringClass} ${isOver && isHover ? 'bg-white/5' : ''} transition-colors`}
      style={style}
    >
      {children}
    </div>
  )
}
