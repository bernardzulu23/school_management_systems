'use client'

import { useMemo, useState } from 'react'
import type { Assignment, Conflict, ConflictSeverity } from '@/lib/timetable/types'
import type { Suggestion } from '@/lib/timetable/suggestionEngine'
import { filterClassCentricConflicts } from '@/lib/timetable/classCentric'
import {
  affectedAssignmentCount,
  conflictDedupeKey,
  primaryAssignmentId,
} from '@/lib/timetable/conflictDedupe'
import { Button } from '@/components/ui/Button'

export interface ConflictDisplayProps {
  conflicts: Map<string, Conflict[]>
  assignments?: Assignment[]
  suggestionsByAssignmentId?: (assignmentId: string) => Suggestion[]
  onApplySuggestion?: (suggestion: Suggestion) => void
  onUndo?: () => void
  onResolveAll?: (suggestions: Suggestion[]) => void
  onHoverAssignmentId?: (assignmentId: string | null) => void
}

type ConflictRow = {
  key: string
  assignmentId: string
  conflict: Conflict
}

function severityOrder(sev: ConflictSeverity) {
  if (sev === 'critical') return 0
  if (sev === 'high') return 1
  if (sev === 'medium') return 2
  return 3
}

function sevClass(sev: ConflictSeverity) {
  if (sev === 'critical') return 'text-red-700'
  if (sev === 'high') return 'text-amber-700'
  if (sev === 'medium') return 'text-yellow-700'
  return 'text-blue-700'
}

export function ConflictDisplay(props: ConflictDisplayProps) {
  const {
    conflicts,
    suggestionsByAssignmentId,
    onApplySuggestion,
    onUndo,
    onResolveAll,
    onHoverAssignmentId,
  } = props

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const rows = useMemo<ConflictRow[]>(() => {
    const seen = new Set<string>()
    const out: ConflictRow[] = []
    for (const [assignmentId, list] of conflicts.entries()) {
      for (const c of filterClassCentricConflicts(list)) {
        const dedupeKey = conflictDedupeKey(c)
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        out.push({
          key: dedupeKey,
          assignmentId: primaryAssignmentId(c, assignmentId),
          conflict: c,
        })
      }
    }
    return out.sort((a, b) => {
      const s = severityOrder(a.conflict.severity) - severityOrder(b.conflict.severity)
      if (s !== 0) return s
      return String(a.conflict.type).localeCompare(String(b.conflict.type))
    })
  }, [conflicts])

  const grouped = useMemo(() => {
    const g: Record<ConflictSeverity, ConflictRow[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    }
    for (const r of rows) g[r.conflict.severity].push(r)
    return g
  }, [rows])

  const total = rows.length
  const resolveAllSuggestions = useMemo(() => {
    if (!suggestionsByAssignmentId) return []
    const all: Suggestion[] = []
    const seen = new Set<string>()
    for (const [assignmentId] of conflicts.entries()) {
      const list = suggestionsByAssignmentId(String(assignmentId)) || []
      for (const s of list) {
        const key = `${assignmentId}|${s.title}`
        if (seen.has(key)) continue
        seen.add(key)
        all.push(s)
        break
      }
    }
    return all
  }, [conflicts, suggestionsByAssignmentId])

  const useVirtual = total >= 50
  const [scrollTop, setScrollTop] = useState(0)
  const rowH = 74
  const viewportH = 520
  const start = useVirtual ? Math.max(0, Math.floor(scrollTop / rowH) - 6) : 0
  const end = useVirtual
    ? Math.min(rows.length, start + Math.ceil(viewportH / rowH) + 12)
    : rows.length
  const visible = useVirtual ? rows.slice(start, end) : rows
  const padTop = useVirtual ? start * rowH : 0
  const padBottom = useVirtual ? (rows.length - end) * rowH : 0

  return (
    <div className="bg-white border border-royalPurple-border/40 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-royalPurple-text1 font-bold text-lg">Conflicts</div>
            <span className="badge-brand">{total}</span>
          </div>
          <div className="text-royalPurple-text3 text-sm">
            Sorted by severity. Click to expand suggestions.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onUndo}
            disabled={!onUndo}
            className="zsms-hover-raise"
          >
            Undo
          </Button>
          <Button
            onClick={() => onResolveAll?.(resolveAllSuggestions)}
            disabled={!onResolveAll || total === 0}
            className="zsms-hover-raise"
          >
            Resolve all
          </Button>
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-6 text-sm text-royalPurple-text2">No conflicts detected.</div>
      ) : null}

      {useVirtual ? (
        <div
          className="mt-4 h-[520px] overflow-auto rounded-xl border border-royalPurple-border/30"
          onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        >
          <div style={{ paddingTop: padTop, paddingBottom: padBottom }}>
            {visible.map((row) => (
              <ConflictRowItem
                key={row.key}
                row={row}
                expanded={expanded}
                setExpanded={setExpanded}
                suggestionsByAssignmentId={suggestionsByAssignmentId}
                onApplySuggestion={onApplySuggestion}
                onHoverAssignmentId={onHoverAssignmentId}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {(Object.keys(grouped) as ConflictSeverity[]).map((sev) =>
            grouped[sev].length ? (
              <div key={sev}>
                <div className={`text-sm font-bold uppercase mb-2 ${sevClass(sev)}`}>{sev}</div>
                <div className="space-y-2">
                  {grouped[sev].map((row) => (
                    <ConflictRowItem
                      key={row.key}
                      row={row}
                      expanded={expanded}
                      setExpanded={setExpanded}
                      suggestionsByAssignmentId={suggestionsByAssignmentId}
                      onApplySuggestion={onApplySuggestion}
                      onHoverAssignmentId={onHoverAssignmentId}
                    />
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

function ConflictRowItem(props: {
  row: ConflictRow
  expanded: Set<string>
  setExpanded: (next: Set<string>) => void
  suggestionsByAssignmentId?: (assignmentId: string) => Suggestion[]
  onApplySuggestion?: (suggestion: Suggestion) => void
  onHoverAssignmentId?: (assignmentId: string | null) => void
}) {
  const {
    row,
    expanded,
    setExpanded,
    suggestionsByAssignmentId,
    onApplySuggestion,
    onHoverAssignmentId,
  } = props
  const isOpen = expanded.has(row.key)
  const suggestions = suggestionsByAssignmentId ? suggestionsByAssignmentId(row.assignmentId) : []

  return (
    <div
      className="bg-white border border-royalPurple-border/40 rounded-xl px-4 py-3 shadow-sm"
      onMouseEnter={() => onHoverAssignmentId?.(row.assignmentId)}
      onMouseLeave={() => onHoverAssignmentId?.(null)}
    >
      <button
        type="button"
        onClick={() => {
          const next = new Set(expanded)
          if (next.has(row.key)) next.delete(row.key)
          else next.add(row.key)
          setExpanded(next)
        }}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`text-xs font-bold uppercase ${sevClass(row.conflict.severity)}`}>
                {row.conflict.severity}
              </div>
              <div className="text-royalPurple-text2 text-xs">{row.conflict.type}</div>
            </div>
            <div className="text-royalPurple-text1 font-semibold mt-1">{row.conflict.message}</div>
            <div className="text-royalPurple-text3 text-xs mt-1">
              {affectedAssignmentCount(row.conflict)} assignment(s) affected
            </div>
          </div>
          <div className="text-royalPurple-text3 text-xs">{isOpen ? 'Hide' : 'Show'}</div>
        </div>
      </button>

      {isOpen ? (
        <div className="mt-3">
          <div className="text-royalPurple-text2 text-sm font-semibold mb-2">
            {suggestions.length
              ? `${Math.min(suggestions.length, 3)} suggestion(s) to fix this:`
              : 'No suggestions available'}
          </div>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((s) => (
              <div
                key={s.title}
                className="border border-royalPurple-border/30 rounded-xl p-3 bg-royalPurple-card/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-royalPurple-text1 font-semibold">{s.title}</div>
                    <div className="text-royalPurple-text2 text-sm mt-1">{s.description}</div>
                    <div className="text-royalPurple-text3 text-xs mt-1">
                      {s.reason} · Affects {s.impactedAssignments} assignment(s)
                    </div>
                  </div>
                  <Button
                    onClick={() => onApplySuggestion?.(s)}
                    disabled={!onApplySuggestion}
                    className="zsms-hover-raise"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
