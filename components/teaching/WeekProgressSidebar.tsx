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
  isTestWeek?: boolean
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
  description = 'Teaching weeks count toward coverage; mid/EOT test weeks are excluded',
  layout = 'sidebar',
  readOnly = false,
}: Props) {
  const teachable = weeks.filter((w) => !(w.isTestWeek || w.isMidTerm || w.isEndOfTerm))
  const completedCount = teachable.filter((w) => w.completed).length
  const total = teachable.length || 0
  const isTest = (week: WeekProgressItem) =>
    Boolean(week.isTestWeek || week.isMidTerm || week.isEndOfTerm)

  const progressBlock = (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">Teaching coverage</span>
        <span className="font-bold">{coveragePercent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, coveragePercent))}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {completedCount} of {total} teaching weeks completed
        {weeks.length > total ? ` · ${weeks.length - total} test week(s) excluded` : ''}
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
                onClick={() =>
                  !readOnly && !isTest(week) && onToggleWeek(week.week, !week.completed)
                }
                disabled={readOnly || isTest(week) || busyWeek === week.week}
                className={cn(
                  'rounded-lg border-2 p-3 text-left transition-all disabled:opacity-50',
                  week.completed
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-border bg-card hover:border-sky-200',
                  isTest(week) && 'cursor-default ring-1 ring-amber-300 bg-amber-50/50',
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

          {!readOnly && teachable.some((w) => !w.completed) && (
            <Button
              type="button"
              variant="outline"
              disabled={busyWeek != null}
              onClick={() => {
                const next = teachable.find((w) => !w.completed)
                if (next) onToggleWeek(next.week, true)
              }}
            >
              Mark next teaching week complete
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
              isTest(w) && 'ring-1 ring-amber-300 bg-amber-50/40'
            )}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-0.5 shrink-0 text-emerald-600 disabled:opacity-50"
                disabled={readOnly || isTest(w) || busyWeek === w.week}
                onClick={() => !readOnly && !isTest(w) && onToggleWeek(w.week, !w.completed)}
                aria-label={
                  isTest(w)
                    ? `Week ${w.week} is a test week (no teaching)`
                    : readOnly
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

      {teachable.some((w) => !w.completed) && !readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={busyWeek != null}
          onClick={() => {
            const next = teachable.find((w) => !w.completed)
            if (next) onToggleWeek(next.week, true)
          }}
        >
          Mark next teaching week complete
        </Button>
      )}
      {readOnly && (
        <p className="text-xs text-muted-foreground">Auto from approved lesson plans only.</p>
      )}
    </aside>
  )
}
