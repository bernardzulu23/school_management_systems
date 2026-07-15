'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Load published timetable grid data for teacher / student / HOD dashboards.
 * Resolves the busiest season that actually has published rows first.
 */
export function usePublishedTimetableView({ enabled = true } = {}) {
  const [term, setTerm] = useState('Term 1')
  const [academicYear, setAcademicYear] = useState(() => String(new Date().getFullYear()))
  const [seasonReady, setSeasonReady] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [teacherSummaries, setTeacherSummaries] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState({ published: 0, draft: 0, total: 0 })

  useEffect(() => {
    if (!enabled) {
      setSeasonReady(true)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/timetable/active-season?prefer=published', {
          cache: 'no-store',
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) {
          if (json.term) setTerm(String(json.term))
          if (json.academicYear) setAcademicYear(String(json.academicYear))
          setMeta({
            published: Number(json.published || 0),
            draft: Number(json.draft || 0),
            total: Number(json.total || 0),
          })
        }
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setSeasonReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  const reload = useCallback(async () => {
    if (!enabled || !seasonReady) return
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ term, academicYear, status: 'published' })
      const res = await fetch(`/api/timetable/view?${qs}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Failed to load timetable')
      }
      setAssignments(Array.isArray(json.assignments) ? json.assignments : [])
      setTimeSlots(Array.isArray(json.timeSlots) ? json.timeSlots : [])
      setTeacherSummaries(Array.isArray(json.teacherSummaries) ? json.teacherSummaries : [])
    } catch (e) {
      setAssignments([])
      setTimeSlots([])
      setTeacherSummaries([])
      setError(e instanceof Error ? e.message : 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [enabled, seasonReady, term, academicYear])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    term,
    setTerm,
    academicYear,
    setAcademicYear,
    assignments,
    timeSlots,
    teacherSummaries,
    loading,
    error,
    meta,
    seasonReady,
    reload,
  }
}
