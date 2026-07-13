'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

export const TIMETABLE_CONFLICTS_UPDATED = 'timetable-conflicts-updated'

export type TimetableDraftMeta = {
  term: string
  academicYear: string
  conflictCount: number
  conflictErrors: number
  conflictWarnings: number
  missingPeriodsCount?: number
  byType?: Record<string, number>
  canPublish: boolean
  lastScannedAt: string | null
  conflictSummary?: unknown[]
}

export function notifyTimetableConflictsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIMETABLE_CONFLICTS_UPDATED))
  }
}

/** Stable key for dismissing a server audit row (matches server `getConflictAuditKey`). */
export function conflictAuditKey(row: {
  auditKey?: string
  allocationId?: string | number
  type?: string
  id?: string
  affectedEntryIds?: string[]
  classId?: string
  teacherId?: string
  day?: string
  dayOfWeek?: string
  startTime?: string
  subjectIds?: string[]
  subjectNames?: string[]
  expectedPeriods?: number
  periodsPerWeek?: number
  description?: string
  severity?: string
}): string {
  if (!row) return ''
  // Prefer server-provided key when present
  if (row.auditKey) return String(row.auditKey).trim()

  const type = String(row.type || '').trim()
  const classId = String(row.classId || '').trim()
  const teacherId = String(row.teacherId || '').trim()
  const day = String(row.day || row.dayOfWeek || '')
    .trim()
    .toLowerCase()
  const start = String(row.startTime || '').trim()
  const subjectIds = [...(row.subjectIds || [])].map(String).filter(Boolean).sort()
  const subjectNames = [...(row.subjectNames || [])].map(String).filter(Boolean).sort()
  const subjectPart = subjectIds.length
    ? subjectIds.join('+')
    : subjectNames.length
      ? subjectNames.join('+')
      : ''

  if (type === 'MISSING_PERIODS') {
    const expected = Number(row.expectedPeriods || row.periodsPerWeek || 0)
    if (classId && subjectPart && teacherId) {
      return `MISSING_PERIODS:${classId}:${subjectPart}:${teacherId}:${expected || 'x'}`
    }
    if (row.allocationId) return `MISSING_PERIODS:${row.allocationId}`
  }
  if (type === 'TEACHER_OVER_ALLOCATED' && teacherId) {
    return `TEACHER_OVER_ALLOCATED:${teacherId}`
  }
  if (
    (type === 'TEACHER_CONSECUTIVE_LIMIT' || type === 'CONSECUTIVE_OVERLOAD') &&
    teacherId &&
    day
  ) {
    return `CONSECUTIVE_OVERLOAD:${teacherId}:${day}`
  }
  if (type === 'SUBJECT_DISTRIBUTION' && classId && subjectPart && day) {
    return `SUBJECT_DISTRIBUTION:${classId}:${subjectPart}:${day}`
  }
  if (type === 'CLASS_DOUBLE_BOOKED' && classId && day && start) {
    return subjectPart
      ? `CLASS_DOUBLE_BOOKED:${classId}:${subjectPart}:${day}:${start}`
      : `CLASS_DOUBLE_BOOKED:${classId}:${day}:${start}`
  }
  if (type === 'TEACHER_DOUBLE_BOOKED' && teacherId && day && start) {
    return `TEACHER_DOUBLE_BOOKED:${teacherId}:${day}:${start}`
  }

  const ids = [...(row.affectedEntryIds || [])].map(String).sort()
  if (ids.length && type) return `${type}:${ids.join(',')}`
  if (classId && teacherId && type) return `${type}:${classId}:${teacherId}`
  return `${type || 'CONFLICT'}:${row.id || row.description || 'unknown'}`
}

export function canDismissAuditRow(row: { severity?: string; type?: string }): boolean {
  if (!row) return false
  if (String(row.severity || '').toLowerCase() === 'error') return false
  if (String(row.type || '') === 'FEASIBILITY_ERROR') return false
  if (String(row.severity || '').toLowerCase() === 'warning') return true
  const type = String(row.type || '')
  return (
    type === 'MISSING_PERIODS' ||
    type === 'TEACHER_OVER_ALLOCATED' ||
    type === 'CONSECUTIVE_OVERLOAD' ||
    type === 'SUBJECT_DISTRIBUTION'
  )
}

const META_STALE_MS = 30 * 60 * 1000

export function isDraftMetaFresh(meta: TimetableDraftMeta | null): boolean {
  if (!meta?.lastScannedAt) return false
  return Date.now() - new Date(meta.lastScannedAt).getTime() < META_STALE_MS
}

export function useTimetableDraftMeta({
  term,
  academicYear,
  enabled = true,
}: {
  term: string
  academicYear: string
  enabled?: boolean
}) {
  const [meta, setMeta] = useState<TimetableDraftMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    async (forceRescan = false) => {
      if (!enabled) return null
      setLoading(true)
      setError(null)
      try {
        const res = await api.getTimetableDraftMeta({
          term,
          academicYear,
          refresh: forceRescan,
        })
        const data = res?.data ?? res
        const next: TimetableDraftMeta = {
          term: data.term || term,
          academicYear: data.academicYear || academicYear,
          conflictCount: Number(data.conflictCount ?? 0),
          conflictErrors: Number(data.conflictErrors ?? 0),
          conflictWarnings: Number(data.conflictWarnings ?? 0),
          missingPeriodsCount: Number(data.missingPeriodsCount ?? 0),
          byType: data.byType && typeof data.byType === 'object' ? data.byType : undefined,
          canPublish: Boolean(data.canPublish ?? true),
          lastScannedAt: data.lastScannedAt ?? null,
          conflictSummary: data.conflictSummary,
        }
        setMeta(next)
        return next
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load conflict meta')
        return null
      } finally {
        setLoading(false)
      }
    },
    [term, academicYear, enabled]
  )

  const rescan = useCallback(async () => {
    if (!enabled) return null
    setLoading(true)
    setError(null)
    try {
      const res = await api.scanTimetableConflicts({ term, academicYear })
      const data = res?.data ?? res
      const next: TimetableDraftMeta = {
        term: data.term || term,
        academicYear: data.academicYear || academicYear,
        conflictCount: Number(data.totalConflicts ?? 0),
        conflictErrors: Number(data.errorCount ?? 0),
        conflictWarnings: Number(data.warningCount ?? 0),
        missingPeriodsCount: Number(data.missingPeriodsCount ?? 0),
        byType: data.byType && typeof data.byType === 'object' ? data.byType : undefined,
        canPublish: Boolean(data.canPublish ?? true),
        lastScannedAt: data.scannedAt ?? new Date().toISOString(),
        conflictSummary: data.conflicts,
      }
      setMeta(next)
      notifyTimetableConflictsUpdated()
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conflict scan failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [term, academicYear, enabled])

  const dismissAudit = useCallback(
    async (auditKeys: string | string[], mode: 'add' | 'remove' | 'clear' = 'add') => {
      if (!enabled) return null
      const keys = Array.isArray(auditKeys) ? auditKeys : [auditKeys]
      setLoading(true)
      setError(null)
      try {
        const res = await api.dismissTimetableDraftAudit({
          term,
          academicYear,
          auditKeys: keys,
          mode,
        })
        const data = res?.data ?? res
        const next: TimetableDraftMeta = {
          term,
          academicYear,
          conflictCount: Number(data.conflictCount ?? 0),
          conflictErrors: Number(data.conflictErrors ?? 0),
          conflictWarnings: Number(data.conflictWarnings ?? 0),
          missingPeriodsCount: Number(data.missingPeriodsCount ?? 0),
          canPublish: Boolean(data.canPublish ?? true),
          lastScannedAt: data.lastScannedAt ?? meta?.lastScannedAt ?? null,
          conflictSummary: data.conflictSummary,
        }
        setMeta(next)
        notifyTimetableConflictsUpdated()
        return next
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to dismiss audit issue')
        return null
      } finally {
        setLoading(false)
      }
    },
    [term, academicYear, enabled, meta?.lastScannedAt]
  )

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    refresh(false)
  }, [refresh, enabled])

  useEffect(() => {
    if (!enabled) return
    const onUpdate = () => refresh(false)
    window.addEventListener(TIMETABLE_CONFLICTS_UPDATED, onUpdate)
    const onFocus = () => refresh(false)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener(TIMETABLE_CONFLICTS_UPDATED, onUpdate)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, enabled])

  return { meta, loading, error, refresh, rescan, dismissAudit, isFresh: isDraftMetaFresh(meta) }
}
