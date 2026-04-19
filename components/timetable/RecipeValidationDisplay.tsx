'use client'

import { useMemo } from 'react'

type ValidationPayload =
  | {
      errors?: Array<{ code?: string; message?: string; suggestion?: string }>
      warnings?: Array<{ code?: string; message?: string; suggestion?: string }>
      totalPeriods?: number
    }
  | null
  | undefined

export function RecipeValidationDisplay(props: { validation: ValidationPayload }) {
  const errors = useMemo(() => props.validation?.errors || [], [props.validation])
  const warnings = useMemo(() => props.validation?.warnings || [], [props.validation])
  const totalPeriods = props.validation?.totalPeriods

  return (
    <div className="space-y-3">
      {typeof totalPeriods === 'number' ? (
        <div className="text-sm text-royalPurple-text2">Total periods: {totalPeriods}</div>
      ) : null}

      {errors.length ? (
        <div className="rounded-2xl border border-royalPurple-danger/30 bg-royalPurple-danger/10 p-4">
          <div className="text-sm font-bold text-royalPurple-dangerTx">Fix required</div>
          <div className="mt-2 space-y-2">
            {errors.map((e, idx) => (
              <div key={idx} className="text-sm text-royalPurple-text1">
                <div className="font-semibold">{e.message || 'Validation error'}</div>
                {e.suggestion ? (
                  <div className="text-xs text-royalPurple-text2 mt-1">{e.suggestion}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-royalPurple-success/30 bg-royalPurple-success/10 p-4">
          <div className="text-sm font-bold text-royalPurple-successTx">Valid</div>
          <div className="text-xs text-royalPurple-text2 mt-1">
            Recipe structure is valid for current time slot configuration.
          </div>
        </div>
      )}

      {warnings.length ? (
        <div className="rounded-2xl border border-royalPurple-warn/30 bg-royalPurple-warn/10 p-4">
          <div className="text-sm font-bold text-royalPurple-text1">Warnings</div>
          <div className="mt-2 space-y-2">
            {warnings.map((w, idx) => (
              <div key={idx} className="text-sm text-royalPurple-text2">
                <div className="font-semibold">{w.message || 'Warning'}</div>
                {w.suggestion ? (
                  <div className="text-xs text-royalPurple-text3 mt-1">{w.suggestion}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
