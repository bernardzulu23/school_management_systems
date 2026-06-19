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
  canPublish: boolean
  lastScannedAt: string | null
  conflictSummary?: unknown[]
}

export function notifyTimetableConflictsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TIMETABLE_CONFLICTS_UPDATED))
  }
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

  return { meta, loading, error, refresh, rescan, isFresh: isDraftMetaFresh(meta) }
}
