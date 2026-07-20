'use client'

/**
 * Phase 4 — 4-card LessonPlanSubmission status grid + Syllabus Readiness Index bar.
 */

const CARD_META = [
  { key: 'DRAFT', label: 'Draft', className: 'bg-slate-100 border-slate-200 text-slate-800' },
  {
    key: 'PENDING_APPROVAL',
    label: 'Pending',
    className: 'bg-amber-50 border-amber-200 text-amber-900',
  },
  {
    key: 'APPROVED',
    label: 'Approved',
    className: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  },
  {
    key: 'REJECTED',
    label: 'Rejected',
    className: 'bg-red-50 border-red-200 text-red-900',
  },
]

/**
 * @param {{
 *   counts?: { DRAFT?: number, PENDING_APPROVAL?: number, APPROVED?: number, REJECTED?: number },
 *   readiness?: { approvedCount?: number, requiredCount?: number, percent?: number },
 *   loading?: boolean,
 *   title?: string,
 * }} props
 */
export default function LessonPlanStatsCards({
  counts = {},
  readiness = null,
  loading = false,
  title = 'Chat lesson plan status',
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {loading && <span className="text-xs text-muted">Loading…</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CARD_META.map((c) => (
          <div key={c.key} className={`rounded-lg border px-3 py-2 ${c.className}`}>
            <div className="text-xs font-medium opacity-80">{c.label}</div>
            <div className="text-2xl font-bold tabular-nums mt-0.5">
              {Number(counts[c.key] || 0)}
            </div>
          </div>
        ))}
      </div>

      {readiness && (
        <div className="rounded-lg border border-ink/10 bg-paper/40 px-3 py-2">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-ink">Syllabus Readiness Index</span>
            <span className="text-muted tabular-nums">
              {Number(readiness.approvedCount || 0)} / {Number(readiness.requiredCount || 0)}{' '}
              approved ({Number(readiness.percent || 0)}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, Number(readiness.percent || 0))}%` }}
            />
          </div>
          <p className="text-[10px] text-muted mt-1">
            Required count uses LESSON_PLAN_REQUIRED_PER_TERM until term syllabus targets are wired.
          </p>
        </div>
      )}
    </div>
  )
}
