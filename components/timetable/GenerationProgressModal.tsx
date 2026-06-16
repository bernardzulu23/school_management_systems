'use client'

import { useEffect } from 'react'
import { Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type GenerationStage =
  | 'idle'
  | 'preflight'
  | 'backtrack'
  | 'solver'
  | 'repair'
  | 'validate'
  | 'done'
  | 'error'

export type GenerationProgressState = {
  open: boolean
  stage: GenerationStage
  message: string
  stats?: {
    placed?: number
    unplaced?: number
    backtracks?: number
    restarts?: number
    engine?: string
  }
  infeasibility?: {
    code: string
    message: string
    details?: string[]
  }
  preflightWarnings?: string[]
}

export function GenerationProgressModal({
  state,
  onClose,
}: {
  state: GenerationProgressState
  onClose: () => void
}) {
  const isError = state.stage === 'error'
  const isDone = state.stage === 'done'
  const canDismiss = isError || isDone

  useEffect(() => {
    if (!state.open || !canDismiss) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.open, canDismiss, onClose])

  if (!state.open) return null

  const handleBackdropClick = () => {
    if (canDismiss) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generation-progress-title"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-royalPurple-border/40 bg-white shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {canDismiss ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1.5 text-royalPurple-text2 hover:bg-royalPurple-muted hover:text-royalPurple-text1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        ) : null}

        <div className="flex items-start gap-3 pr-8">
          {isError ? (
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={22} />
          ) : isDone ? (
            <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={22} />
          ) : (
            <Loader2 className="text-royalPurple-text2 shrink-0 mt-0.5 animate-spin" size={22} />
          )}
          <div>
            <div id="generation-progress-title" className="font-semibold text-royalPurple-text1">
              {isError
                ? 'Generation failed'
                : isDone
                  ? 'Timetable generated'
                  : 'Generating timetable…'}
            </div>
            <div className="text-sm text-royalPurple-text2 mt-1">{state.message}</div>
          </div>
        </div>

        {!isError && !isDone ? (
          <div className="text-xs text-royalPurple-text3 uppercase tracking-wide">
            Stage: {state.stage}
          </div>
        ) : null}

        {state.stats && (isDone || isError) ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {state.stats.placed != null ? (
              <div className="onboard-card p-2">
                <div className="text-xs text-royalPurple-text3">Placed</div>
                <div className="font-bold">{state.stats.placed}</div>
              </div>
            ) : null}
            {state.stats.unplaced != null ? (
              <div className="onboard-card p-2">
                <div className="text-xs text-royalPurple-text3">Unplaced</div>
                <div className="font-bold">{state.stats.unplaced}</div>
              </div>
            ) : null}
            {state.stats.engine ? (
              <div className="onboard-card p-2 col-span-2">
                <div className="text-xs text-royalPurple-text3">Engine</div>
                <div className="font-medium capitalize">{state.stats.engine}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {state.infeasibility ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm space-y-2">
            <div className="font-medium text-red-800">{state.infeasibility.message}</div>
            {(state.infeasibility.details || []).slice(0, 5).map((d, i) => (
              <div key={i} className="text-red-700 text-xs">
                • {d}
              </div>
            ))}
          </div>
        ) : null}

        {state.preflightWarnings?.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
            <div className="font-medium">Preflight warnings</div>
            {state.preflightWarnings.slice(0, 4).map((w, i) => (
              <div key={i}>• {w}</div>
            ))}
          </div>
        ) : null}

        {canDismiss ? (
          <Button type="button" variant="primary" fullWidth onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
    </div>
  )
}
