'use client'

import { ECZ_RUBRIC_LEVELS } from '@/lib/ecz/ecz-rubric-builder'

/**
 * Displays ECZ 4-level rubric criteria (read-only or interactive scoring).
 */
export function EczRubricTable({
  criteria = [],
  compact = false,
  interactive = false,
  selectedLevels = {},
  onLevelChange,
  criterionKey = 'id',
}) {
  if (!criteria.length) return null

  const levelField = (c, key) => {
    if (key === 'excellent') return c.excellent
    if (key === 'good') return c.good
    if (key === 'fair') return c.fair
    if (key === 'needs_improvement') return c.needs_improvement || c.needsImpr
    return ''
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-royalPurple-border/50">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-royalPurple-deep/60 text-left">
            <th className="p-2 font-semibold text-royalPurple-text1 w-[18%]">Criteria</th>
            {ECZ_RUBRIC_LEVELS.map((l) => (
              <th key={l.key} className="p-2 font-medium text-xs text-royalPurple-text2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 ${
                    l.value === 4
                      ? 'bg-green-500/20 text-green-200'
                      : l.value === 3
                        ? 'bg-blue-500/20 text-blue-200'
                        : l.value === 2
                          ? 'bg-amber-500/20 text-amber-200'
                          : 'bg-red-500/20 text-red-200'
                  }`}
                >
                  {l.label} — {l.short}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, i) => {
            const ck = c[criterionKey] ?? c.id ?? i
            const selected = String(selectedLevels[ck] || '')
            return (
              <tr key={c.id || i} className="border-t border-royalPurple-border/40">
                <td className="p-2 align-top">
                  <p className="font-medium text-royalPurple-text1">{c.name}</p>
                  {c.description && !compact ? (
                    <p className="text-xs text-royalPurple-text3 mt-0.5">{c.description}</p>
                  ) : null}
                </td>
                {ECZ_RUBRIC_LEVELS.map((l) => {
                  const isSelected = interactive && selected === String(l.value)
                  const text = levelField(c, l.key)
                  return (
                    <td
                      key={l.key}
                      className={`p-2 align-top text-xs text-royalPurple-text2 ${
                        interactive
                          ? 'cursor-pointer transition-colors hover:bg-royalPurple-muted/30'
                          : ''
                      } ${isSelected ? 'ring-2 ring-inset ring-accent bg-accent/10' : ''}`}
                      onClick={
                        interactive && onLevelChange
                          ? () => onLevelChange(ck, String(l.value))
                          : undefined
                      }
                      role={interactive ? 'button' : undefined}
                      tabIndex={interactive ? 0 : undefined}
                      onKeyDown={
                        interactive && onLevelChange
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onLevelChange(ck, String(l.value))
                              }
                            }
                          : undefined
                      }
                    >
                      {text}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-xs text-royalPurple-text3 p-2 border-t border-royalPurple-border/40">
        {interactive ? 'Click a descriptor cell to set the level for that criterion.' : null}{' '}
        Maximum raw score: {criteria.length} × 4 = {criteria.length * 4} points (scaled to /20 per
        task when recorded).
      </p>
    </div>
  )
}
