'use client'

import { CheckCircle2, Circle, Clock, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type WeekProgressItem = {
  week: number
  topic: string
  completed: boolean
  completedAt?: string | null
  isMidTerm?: boolean
  isEndOfTerm?: boolean
}

type Props = {
  weeks: WeekProgressItem[]
  coveragePercent: number
  busyWeek?: number | null
  onToggleWeek: (week: number, completed: boolean) => void
  /** Optional header context */
  title?: string
  description?: string
  /** denser week grid (Teaching Studio Progress tab) */
  layout?: 'sidebar' | 'grid'
  /** When true, weeks are driven by approved lesson plans (no manual toggle) */
  readOnly?: boolean
}

export function WeekProgressSidebar({
  weeks,
  coveragePercent,
  busyWeek,
  onToggleWeek,
  title = 'Week progress',
  description = 'Weeks count as taught only when an approved lesson plan exists',
  layout = 'sidebar',
  readOnly = false,
}: Props) {
  const completedCount = weeks.filter((w) => w.completed).length
  const total = weeks.length || 1

  const progressBlock = (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">Overall Progress</span>
        <span className="font-bold">{coveragePercent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, coveragePercent))}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {completedCount} of {total} weeks completed
      </p>
    </div>
  )

  const legend = (
    <div className="flex gap-4 border-t pt-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span>Completed</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>Not started</span>
      </div>
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-amber-600" />
        <span>Test week</span>
      </div>
    </div>
  )

  if (layout === 'grid') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {progressBlock}

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {weeks.map((week) => (
              <button
                key={week.week}
                type="button"
                onClick={() => !readOnly && onToggleWeek(week.week, !week.completed)}
                disabled={readOnly || busyWeek === week.week}
                className={cn(
                  'rounded-lg border-2 p-3 text-left transition-all disabled:opacity-50',
                  week.completed
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-border bg-card hover:border-sky-200',
                  (week.isMidTerm || week.isEndOfTerm) && 'ring-1 ring-amber-300',
                  readOnly && 'cursor-default'
                )}
              >
                <div className="flex items-center gap-2">
                  {week.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">W{week.week}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{week.topic}</p>
                {week.isMidTerm && (
                  <p className="mt-1 text-[10px] font-medium text-amber-700">Mid-term</p>
                )}
                {week.isEndOfTerm && (
                  <p className="mt-1 text-[10px] font-medium text-orange-700">End-of-term</p>
                )}
              </button>
            ))}
          </div>

          {weeks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Generate or select a scheme to track weeks.
            </p>
          )}

          {!readOnly && weeks.some((w) => !w.completed) && (
            <Button
              type="button"
              variant="outline"
              disabled={busyWeek != null}
              onClick={() => {
                const next = weeks.find((w) => !w.completed)
                if (next) onToggleWeek(next.week, true)
              }}
            >
              Mark next week complete
            </Button>
          )}

          {readOnly && (
            <p className="text-xs text-muted-foreground">
              Progress updates automatically when a lesson plan is approved (secondary: HOD ·
              primary: senior teacher / deputy).
            </p>
          )}

          {legend}
        </CardContent>
      </Card>
    )
  }

  return (
    <aside className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {progressBlock}

      <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {weeks.map((w) => (
          <li
            key={w.week}
            className={cn(
              'rounded-md border p-2',
              w.completed ? 'border-emerald-200 bg-emerald-50/60' : 'border-border',
              (w.isMidTerm || w.isEndOfTerm) && 'ring-1 ring-amber-300'
            )}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-0.5 shrink-0 text-emerald-600 disabled:opacity-50"
                disabled={readOnly || busyWeek === w.week}
                onClick={() => !readOnly && onToggleWeek(w.week, !w.completed)}
                aria-label={
                  readOnly
                    ? w.completed
                      ? `Week ${w.week} taught (approved lesson plan)`
                      : `Week ${w.week} not taught`
                    : w.completed
                      ? `Unmark week ${w.week}`
                      : `Mark week ${w.week} complete`
                }
              >
                {w.completed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-sm font-medium">Week {w.week}</span>
                  {w.isMidTerm && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      <Flag className="h-3 w-3" /> Mid-term
                    </span>
                  )}
                  {w.isEndOfTerm && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800">
                      <Flag className="h-3 w-3" /> End-of-term
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{w.topic}</p>
              </div>
            </div>
          </li>
        ))}
        {weeks.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Generate or select a scheme to track weeks.
          </li>
        )}
      </ul>

      {weeks.some((w) => !w.completed) && !readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={busyWeek != null}
          onClick={() => {
            const next = weeks.find((w) => !w.completed)
            if (next) onToggleWeek(next.week, true)
          }}
        >
          Mark next week complete
        </Button>
      )}
      {readOnly && (
        <p className="text-xs text-muted-foreground">Auto from approved lesson plans only.</p>
      )}
    </aside>
  )
}
