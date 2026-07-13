'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import {
  notifyTimetableConflictsUpdated,
  conflictAuditKey,
  canDismissAuditRow,
} from '@/hooks/useTimetableDraftMeta'
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  UserX,
  Trash2,
  MoveRight,
  X,
  ArrowLeft,
} from 'lucide-react'

function formatTypeLabel(type) {
  return String(type || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

function TimetableConflictsContent() {
  const searchParams = useSearchParams()
  const term = searchParams.get('term') || 'Term 1'
  const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear())

  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [dismissing, setDismissing] = useState(null)
  const [creatingDraft, setCreatingDraft] = useState(false)

  const fetchConflicts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.scanTimetableConflicts({ term, academicYear })
      const data = res?.data ?? res
      if (!data || data.error) throw new Error(data?.error || 'Failed to fetch conflicts')
      setSummary(data)
    } catch (e) {
      setError(e?.message || 'Failed to fetch conflicts')
    } finally {
      setLoading(false)
    }
  }, [term, academicYear])

  useEffect(() => {
    fetchConflicts()
  }, [fetchConflicts])

  const resolve = async (action, payload, conflictId) => {
    setResolving(conflictId)
    setSuccessMsg(null)
    try {
      const res = await api.resolveTimetableConflict({ action, ...payload })
      const data = res?.data ?? res
      if (!data?.success) throw new Error(data?.error || 'Resolution failed')
      setSuccessMsg(data.message)
      setExpanded(null)
      notifyTimetableConflictsUpdated()
      await fetchConflicts()
    } catch (e) {
      setError(e?.message || 'Resolution failed')
    } finally {
      setResolving(null)
    }
  }

  const dismissConflict = async (conflict) => {
    const key = conflictAuditKey(conflict)
    if (!key) return
    setDismissing(conflict.id)
    setSuccessMsg(null)
    setError(null)
    try {
      const res = await api.dismissTimetableDraftAudit({
        term,
        academicYear,
        auditKey: key,
        mode: 'add',
      })
      const data = res?.data ?? res
      if (!data?.success) throw new Error(data?.error || 'Dismiss failed')
      setSuccessMsg('Warning dismissed — it will stay hidden until you restore dismissed items.')
      setExpanded(null)
      notifyTimetableConflictsUpdated()
      await fetchConflicts()
    } catch (e) {
      setError(e?.message || 'Dismiss failed')
    } finally {
      setDismissing(null)
    }
  }

  const createEditableDraft = async () => {
    setCreatingDraft(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await api.clonePublishedTimetableToDraft({ term, academicYear })
      const data = res?.data ?? res
      if (!data?.success) throw new Error(data?.error || data?.message || 'Failed to create draft')
      setSuccessMsg(data.message || 'Editable draft created.')
      notifyTimetableConflictsUpdated()
      await fetchConflicts()
    } catch (e) {
      setError(e?.message || 'Failed to create draft')
    } finally {
      setCreatingDraft(false)
    }
  }

  const sortedConflicts = summary?.conflicts
    ? [...summary.conflicts].sort((a, b) =>
        a.severity === 'error' && b.severity !== 'error' ? -1 : 1
      )
    : []

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mb-4">
        <Link
          href={`/dashboard/headteacher/timetable?term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}`}
          className="inline-flex items-center gap-1.5 text-sm text-royalPurple-text3 hover:text-royalPurple-text1 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Timetable
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-royalPurple-text1 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-400" />
            Conflict Resolution Centre
          </h1>
          <p className="text-sm text-royalPurple-text3 mt-1">
            {term} · {academicYear}
            {loading
              ? ' · Scanning timetable...'
              : summary
                ? ` · ${summary.totalConflicts} conflict${summary.totalConflicts !== 1 ? 's' : ''} · Last scanned ${new Date(summary.scannedAt).toLocaleTimeString()}`
                : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchConflicts}
          disabled={loading}
          className="zsms-btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Rescan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 text-sm flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {summary && !loading && summary.source === 'published' ? (
        <div className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 text-sm flex flex-wrap items-center justify-between gap-3">
          <span>
            {summary.message ||
              'This timetable is published. Conflicts are read-only until you create an editable draft.'}
          </span>
          <button
            type="button"
            onClick={createEditableDraft}
            disabled={creatingDraft}
            className="zsms-btn-primary text-sm disabled:opacity-50"
          >
            {creatingDraft ? 'Creating draft…' : 'Create editable draft'}
          </button>
        </div>
      ) : null}

      {summary && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="onboard-card p-4 border-red-500/20">
            <div className="text-xs text-red-400 uppercase tracking-wider mb-1">Errors</div>
            <div className="text-3xl font-bold text-red-300">{summary.errorCount}</div>
            <div className="text-xs text-red-400/60 mt-1">Must fix before publishing</div>
          </div>
          <div className="onboard-card p-4 border-amber-500/20">
            <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">Warnings</div>
            <div className="text-3xl font-bold text-amber-300">{summary.warningCount}</div>
            <div className="text-xs text-amber-400/60 mt-1">Review before publishing</div>
          </div>
          <div
            className={`onboard-card p-4 ${summary.canPublish ? 'border-green-500/20' : 'border-royalPurple-border/40'}`}
          >
            <div className="text-xs text-royalPurple-text3 uppercase tracking-wider mb-1">
              Status
            </div>
            <div
              className={`text-2xl font-bold ${summary.canPublish ? 'text-green-300' : 'text-red-300'}`}
            >
              {summary.canPublish ? 'Ready' : 'Blocked'}
            </div>
            <div className="text-xs text-royalPurple-text3 mt-1">
              {summary.canPublish
                ? 'Safe to publish'
                : summary.source === 'published'
                  ? 'Fix in draft, then re-publish'
                  : 'Fix errors first'}
            </div>
          </div>
        </div>
      )}

      {!loading && summary?.source === 'none' && (
        <div className="onboard-card text-center py-16">
          <p className="text-royalPurple-text2">{summary.message}</p>
          <Link
            href={`/dashboard/headteacher/timetable?term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}`}
            className="zsms-btn-primary inline-block mt-4 text-sm"
          >
            Go to Timetable
          </Link>
        </div>
      )}

      {!loading && summary?.entryCount > 0 && summary.totalConflicts === 0 && (
        <div className="onboard-card text-center py-16">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <p className="text-green-300 text-lg font-medium">No conflicts detected</p>
          <p className="text-royalPurple-text3 text-sm mt-2">
            Your draft timetable is ready to publish.
          </p>
          <Link
            href="/dashboard/headteacher/timetable"
            className="zsms-btn-primary inline-block mt-4 text-sm"
          >
            Go to Timetable
          </Link>
        </div>
      )}

      {!loading && sortedConflicts.length > 0 && (
        <div className="space-y-3">
          {sortedConflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="onboard-card overflow-hidden border-royalPurple-border/40"
            >
              <button
                type="button"
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-royalPurple-accent/5 transition-colors"
                onClick={() => setExpanded(expanded === conflict.id ? null : conflict.id)}
              >
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    conflict.severity === 'error' ? 'bg-red-400' : 'bg-amber-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        conflict.severity === 'error'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {conflict.severity === 'error' ? 'Error' : 'Warning'}
                    </span>
                    <span className="text-xs text-royalPurple-text3 bg-royalPurple-card/60 px-2 py-0.5 rounded-full">
                      {formatTypeLabel(conflict.type)}
                    </span>
                    {conflict.day && (
                      <span className="text-xs text-royalPurple-text2">
                        {conflict.day} {conflict.startTime}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-royalPurple-text1">{conflict.description}</p>
                  <p className="text-xs text-royalPurple-text3 mt-1">💡 {conflict.suggestedFix}</p>
                </div>
                {expanded === conflict.id ? (
                  <ChevronUp size={16} className="text-royalPurple-text3 flex-shrink-0 mt-1" />
                ) : (
                  <ChevronDown size={16} className="text-royalPurple-text3 flex-shrink-0 mt-1" />
                )}
              </button>

              {expanded === conflict.id && (
                <div className="border-t border-royalPurple-border/30 p-4 bg-royalPurple-card/20">
                  {summary?.canEditConflicts === false ? (
                    <p className="text-sm text-amber-200 mb-3">
                      Create an editable draft above to apply fixes from this screen.
                    </p>
                  ) : null}
                  <p className="text-xs text-royalPurple-text3 uppercase tracking-wider mb-3">
                    Resolution options
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(conflict.type === 'TEACHER_DOUBLE_BOOKED' ||
                      conflict.type === 'CLASS_DOUBLE_BOOKED') &&
                      conflict.affectedEntryIds?.length >= 2 &&
                      summary?.canEditConflicts !== false && (
                        <>
                          <button
                            type="button"
                            disabled={resolving === conflict.id}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  'Remove the second conflicting entry? This cannot be undone.'
                                )
                              )
                                return
                              resolve(
                                'REMOVE_ENTRY',
                                { entryId: conflict.affectedEntryIds[1] },
                                conflict.id
                              )
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded-lg"
                          >
                            <Trash2 size={12} />
                            Remove duplicate entry
                          </button>
                          {conflict.type === 'TEACHER_DOUBLE_BOOKED' && (
                            <button
                              type="button"
                              disabled={resolving === conflict.id}
                              onClick={() => {
                                const newTeacherId = window.prompt(
                                  'Enter the new teacher user ID to reassign:'
                                )
                                if (newTeacherId) {
                                  resolve(
                                    'REASSIGN_TEACHER',
                                    {
                                      entryId: conflict.affectedEntryIds[0],
                                      newTeacherId,
                                    },
                                    conflict.id
                                  )
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-lg"
                            >
                              <UserX size={12} />
                              Reassign teacher
                            </button>
                          )}
                          {conflict.type === 'CLASS_DOUBLE_BOOKED' && (
                            <button
                              type="button"
                              disabled={resolving === conflict.id}
                              onClick={() => {
                                const targetEntryId = window.prompt(
                                  'Enter the entry ID to swap time slots with:'
                                )
                                if (targetEntryId) {
                                  resolve(
                                    'MOVE_TO_SLOT',
                                    {
                                      entryId: conflict.affectedEntryIds[1],
                                      targetEntryId,
                                    },
                                    conflict.id
                                  )
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-royalPurple-accent hover:opacity-90 disabled:opacity-50 text-white text-xs rounded-lg"
                            >
                              <MoveRight size={12} />
                              Move using another entry&apos;s slot
                            </button>
                          )}
                        </>
                      )}

                    {(conflict.type === 'TEACHER_OVER_ALLOCATED' ||
                      conflict.type === 'CONSECUTIVE_OVERLOAD' ||
                      conflict.type === 'MISSING_PERIODS') && (
                      <Link
                        href={
                          conflict.reviewHref ||
                          (conflict.type === 'MISSING_PERIODS'
                            ? `/dashboard/headteacher/timetable?tab=allocations&term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}&focusClass=${encodeURIComponent(conflict.className || '')}&focusSubject=${encodeURIComponent((conflict.subjectNames && conflict.subjectNames[0]) || '')}&focusTeacher=${encodeURIComponent(conflict.teacherName || '')}`
                            : '/dashboard/hod/allocation')
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg"
                      >
                        <ArrowRightLeft size={12} />
                        {conflict.type === 'MISSING_PERIODS'
                          ? 'Review allocations'
                          : 'Review teacher allocations'}
                      </Link>
                    )}

                    {canDismissAuditRow(conflict) && conflictAuditKey(conflict) ? (
                      <button
                        type="button"
                        disabled={dismissing === conflict.id || resolving === conflict.id}
                        onClick={() => dismissConflict(conflict)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-royalPurple-border/50 hover:bg-royalPurple-accent/10 disabled:opacity-50 text-royalPurple-text2 text-xs rounded-lg"
                      >
                        <X size={12} />
                        Dismiss warning
                      </button>
                    ) : null}

                    {conflict.affectedEntryIds?.length >= 2 &&
                      (conflict.type === 'TEACHER_DOUBLE_BOOKED' ||
                        conflict.type === 'CLASS_DOUBLE_BOOKED') &&
                      summary?.canEditConflicts !== false && (
                        <button
                          type="button"
                          disabled={resolving === conflict.id}
                          onClick={() =>
                            resolve(
                              'SWAP_SLOTS',
                              {
                                entryAId: conflict.affectedEntryIds[0],
                                entryBId: conflict.affectedEntryIds[1],
                              },
                              conflict.id
                            )
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-royalPurple-border/50 hover:bg-royalPurple-accent/10 disabled:opacity-50 text-royalPurple-text2 text-xs rounded-lg"
                        >
                          <ArrowRightLeft size={12} />
                          Swap time slots
                        </button>
                      )}
                  </div>
                  {resolving === conflict.id && (
                    <p className="text-xs text-royalPurple-text3 mt-3 animate-pulse">
                      Applying resolution...
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TimetableConflictsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-royalPurple-text3 text-sm">Loading conflict centre...</div>
      }
    >
      <TimetableConflictsContent />
    </Suspense>
  )
}
