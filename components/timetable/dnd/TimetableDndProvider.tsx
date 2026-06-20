'use client'

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { ReactNode } from 'react'

export interface TimetableDndProviderProps {
  children: ReactNode
  overlay?: ReactNode
  onDragStart?: (event: DragStartEvent) => void
  onDragOver?: (event: DragOverEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  onDragCancel?: () => void
}

export function TimetableDndProvider({
  children,
  overlay,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
}: TimetableDndProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
    </DndContext>
  )
}
