'use client'

import { useCallback, useEffect, useState } from 'react'

function clientAgentLog(payload) {
  // Prefer same-origin bridge (writes NDJSON on the Next server), then local ingest.
  const body = JSON.stringify({
    sessionId: 'a471db',
    timestamp: Date.now(),
    runId: 'pre-fix',
    ...payload,
  })
  fetch('/api/debug/agent-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body,
  }).catch(() => {})
  fetch('http://127.0.0.1:7916/ingest/6dcdb48d-b049-4be9-ba0f-aa3c684df7ce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a471db' },
    body,
  }).catch(() => {})
}

/**
 * Load published timetable grid data for teacher / student / HOD dashboards.
 * Resolves the busiest season that actually has published rows first.
 *
 * @param {{ enabled?: boolean, scope?: 'department' | null }} [opts]
 *   scope=department — HOD (or teacher with HOD profile) department wall view
 */
export function usePublishedTimetableView({ enabled = true, scope = null } = {}) {
  const [term, setTerm] = useState('Term 1')
  const [academicYear, setAcademicYear] = useState(() => String(new Date().getFullYear()))
  const [seasonReady, setSeasonReady] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [teacherSummaries, setTeacherSummaries] = useState([])
  const [classId, setClassId] = useState(null)
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
        // #region agent log
        clientAgentLog({
          hypothesisId: 'A,D',
          location: 'usePublishedTimetableView.js:active-season',
          message: 'client active-season result',
          data: {
            ok: res.ok,
            status: res.status,
            term: json?.term || null,
            academicYear: json?.academicYear || null,
            published: Number(json?.published || 0),
            draft: Number(json?.draft || 0),
            error: json?.error || json?.message || null,
            code: json?.code || null,
          },
        })
        // #endregion
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
      if (scope === 'department') qs.set('scope', 'department')
      const res = await fetch(`/api/timetable/view?${qs}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      // #region agent log
      clientAgentLog({
        hypothesisId: 'A,B,C,D',
        location: 'usePublishedTimetableView.js:view',
        message: 'client view result',
        data: {
          ok: res.ok,
          status: res.status,
          term,
          academicYear,
          scope,
          assignmentCount: Array.isArray(json?.assignments) ? json.assignments.length : -1,
          timeSlotCount: Array.isArray(json?.timeSlots) ? json.timeSlots.length : -1,
          classId: json?.classId || null,
          apiMessage: json?.message || null,
          error: json?.error || null,
          code: json?.code || null,
        },
      })
      // #endregion
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Failed to load timetable')
      }
      setAssignments(Array.isArray(json.assignments) ? json.assignments : [])
      setTimeSlots(Array.isArray(json.timeSlots) ? json.timeSlots : [])
      setTeacherSummaries(Array.isArray(json.teacherSummaries) ? json.teacherSummaries : [])
      setClassId(json.classId ? String(json.classId) : null)
    } catch (e) {
      // #region agent log
      clientAgentLog({
        hypothesisId: 'D',
        location: 'usePublishedTimetableView.js:catch',
        message: 'client view threw',
        data: {
          term,
          academicYear,
          scope,
          error: e instanceof Error ? e.message : String(e),
        },
      })
      // #endregion
      setAssignments([])
      setTimeSlots([])
      setTeacherSummaries([])
      setClassId(null)
      setError(e instanceof Error ? e.message : 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [enabled, seasonReady, term, academicYear, scope])

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
    classId,
    loading,
    error,
    meta,
    seasonReady,
    reload,
  }
}
