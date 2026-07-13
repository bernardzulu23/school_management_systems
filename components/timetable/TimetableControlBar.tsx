'use client'

import { Button } from '@/components/ui/Button'
import { printTimetable } from '@/lib/timetable/printTimetable'
import { LayoutGrid, Printer, Redo2, RefreshCw, Undo2, User, Users } from 'lucide-react'

export type TimetableGridMode = 'wall' | 'master' | 'teacher' | 'class'

export function TimetableControlBar({
  gridMode,
  onGridModeChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onReload,
  reloading,
  conflictCount,
  isPublished,
}: {
  gridMode: TimetableGridMode
  onGridModeChange: (mode: TimetableGridMode) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onReload: () => void
  reloading?: boolean
  conflictCount: number
  isPublished: boolean
}) {
  const modes: { id: TimetableGridMode; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'wall', label: 'Class wall', icon: Users },
    { id: 'master', label: 'By period', icon: LayoutGrid },
    { id: 'teacher', label: 'Teachers', icon: User },
    { id: 'class', label: 'One class', icon: Users },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/50 p-3 print:hidden">
      <div className="text-xs font-semibold uppercase tracking-wide text-royalPurple-text3 mr-1">
        View (aSc-style)
      </div>
      {modes.map((m) => {
        const Icon = m.icon
        const active = gridMode === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onGridModeChange(m.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              active
                ? 'bg-royalPurple-accent text-white border-royalPurple-accent'
                : 'bg-royalPurple-card/40 text-royalPurple-text2 border-royalPurple-border/40 hover:border-royalPurple-accent/50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        )
      })}

      <div className="w-px h-6 bg-royalPurple-border/40 mx-1 hidden sm:block" />

      <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} title="Undo">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} title="Redo">
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => printTimetable()} title="Print timetable">
        <Printer className="h-4 w-4 mr-1" />
        Print
      </Button>
      <Button variant="outline" size="sm" onClick={onReload} disabled={reloading}>
        <RefreshCw className={`h-4 w-4 mr-1 ${reloading ? 'animate-spin' : ''}`} />
        Reload
      </Button>

      <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${
            conflictCount === 0 ? 'bg-kpi-pass/20 text-kpi-pass' : 'bg-kpi-fail/20 text-kpi-fail'
          }`}
        >
          {conflictCount === 0
            ? 'No confirmed conflicts'
            : `${conflictCount} confirmed conflict(s)`}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${
            isPublished ? 'bg-kpi-pass/20 text-kpi-pass' : 'bg-kpi-warn/20 text-kpi-warn'
          }`}
        >
          {isPublished ? 'Published' : 'Draft'}
        </span>
      </div>
    </div>
  )
}
