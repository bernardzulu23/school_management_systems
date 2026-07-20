'use client'

import { useCallback, useEffect, useState } from 'react'
import LessonPlanStatsCards from '@/components/chat/LessonPlanStatsCards'

/**
 * HOD Teaching Coverage / Teacher Effectiveness drilldown for chat lesson plans.
 */
export default function HodTeacherCoveragePanel() {
  const [teachers, setTeachers] = useState([])
  const [teacherId, setTeacherId] = useState('')
  const [coverage, setCoverage] = useState(null)
  const [requiredCount, setRequiredCount] = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState(null)

  const loadTeachers = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      const res = await fetch('/api/hod/lesson-plans/teacher-coverage', {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to load teachers')
      setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
      if (data.requiredCount != null) setRequiredCount(data.requiredCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setTeachers([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadTeachers()
  }, [loadTeachers])

  useEffect(() => {
    if (!teacherId) {
      setCoverage(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setLoadingDetail(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/hod/lesson-plans/teacher-coverage?teacherId=${encodeURIComponent(teacherId)}`,
          { credentials: 'include' }
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || data.message || 'Coverage fetch failed')
        if (!cancelled) setCoverage(data)
      } catch (err) {
        if (!cancelled) {
          setCoverage(null)
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [teacherId])

  return (
    <div className="space-y-3 border border-ink/10 rounded-lg p-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">
          Teaching Coverage / Teacher Effectiveness
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Chat lesson-plan totals for teachers in your department only.
          {requiredCount != null ? ` Required per term: ${requiredCount}.` : ''}
        </p>
      </div>

      <label className="block text-xs font-medium text-ink">
        Select teacher
        <select
          className="mt-1 w-full rounded-lg border-2 border-ink/10 px-2 py-1.5 text-sm"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          disabled={loadingList}
        >
          <option value="">{loadingList ? 'Loading…' : 'Choose a teacher…'}</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.email || t.id}
            </option>
          ))}
        </select>
      </label>

      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}

      {teacherId && coverage && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-ink/10 px-3 py-2">
              <div className="text-xs text-muted">Total submissions</div>
              <div className="text-xl font-bold tabular-nums">{coverage.total ?? 0}</div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-xs text-emerald-800">Approved</div>
              <div className="text-xl font-bold tabular-nums text-emerald-900">
                {coverage.approved ?? 0}
              </div>
            </div>
          </div>
          <LessonPlanStatsCards
            title={`${coverage.teacher?.name || 'Teacher'} — readiness`}
            counts={{
              DRAFT: 0,
              PENDING_APPROVAL: 0,
              APPROVED: coverage.approved || 0,
              REJECTED: 0,
            }}
            readiness={coverage.readiness}
            loading={loadingDetail}
          />
        </div>
      )}

      {teacherId && loadingDetail && !coverage && (
        <p className="text-xs text-muted">Loading coverage…</p>
      )}

      {!loadingList && teachers.length === 0 && (
        <p className="text-xs text-muted">No teachers found in your department.</p>
      )}
    </div>
  )
}
