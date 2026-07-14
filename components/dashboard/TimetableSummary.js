'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import SkeletonLoader from '@/components/SkeletonLoader'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { filterClassesForWallGrid, inferClassGrade } from '@/lib/timetable/activeClasses'
import { AscClassWallGrid } from '@/components/timetable/AscClassWallGrid'
import { pastelBgForSubject } from '@/lib/timetable/cardColors'
import { Calendar, Clock, MapPin, User, ChevronRight, AlertCircle } from 'lucide-react'
import { getDefaultAcademicYear, getDefaultTerm } from '@/lib/timetable/timetableTermOptions'
import {
  readStoredTimetableSeason,
  writeStoredTimetableSeason,
} from '@/lib/timetable/timetableSeasonPreference'
import {
  TIMETABLE_CONFLICTS_UPDATED,
  readTimetableConflictCountsSnapshot,
} from '@/hooks/useTimetableDraftMeta'

function dayKeyFromDate(d) {
  const key = String(
    d.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'Africa/Lusaka',
    })
  ).toLowerCase()
  if (key.startsWith('mon')) return 'monday'
  if (key.startsWith('tue')) return 'tuesday'
  if (key.startsWith('wed')) return 'wednesday'
  if (key.startsWith('thu')) return 'thursday'
  if (key.startsWith('fri')) return 'friday'
  return null
}

function hhmmToMinutes(v) {
  const [h, m] = String(v || '0:0')
    .split(':')
    .map((x) => Number(x))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

function seasonFromMode(mode) {
  if (mode === 'harvest') return 'farming'
  if (mode === 'planting') return 'planting'
  return 'normal'
}

function timeAgo(iso) {
  const ts = Date.parse(String(iso || ''))
  if (!Number.isFinite(ts)) return null
  const diffMs = Date.now() - ts
  if (diffMs < 30 * 1000) return 'Just now'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function TimetableSummary({ userRole, userId, className = '' }) {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  const assignments = useTimetableStore((s) => s.assignments)
  const isPublished = useTimetableStore((s) => s.isPublished)
  const lastPublishedAt = useTimetableStore((s) => s.lastPublishedAt)
  const pendingChanges = useTimetableStore((s) => s.pendingChanges)
  const seasonMode = useTimetableStore((s) => s.currentSeason)
  const publish = useTimetableStore((s) => s.publish)
  const loadFromApi = useTimetableStore((s) => s.loadFromApi)
  const storeTimeSlots = useTimetableStore((s) => s.timeSlots)
  const [bellLoading, setBellLoading] = useState(true)
  const [wallClasses, setWallClasses] = useState([])
  const [serverConflictErrors, setServerConflictErrors] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [viewStatus, setViewStatus] = useState(null) // 'draft' | 'published' | null

  useEffect(() => {
    let cancelled = false
    async function loadConflictCounts() {
      try {
        const snap = readTimetableConflictCountsSnapshot()
        if (snap && !cancelled) setServerConflictErrors(Number(snap.conflictErrors ?? 0))
        const term = String(snap?.term || getDefaultTerm())
        const academicYear = String(snap?.academicYear || getDefaultAcademicYear())
        const qs = new URLSearchParams({ term, academicYear })
        const res = await sessionFetch(`/api/timetable/draft-meta?${qs}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        setServerConflictErrors(Number(data.conflictErrors ?? 0))
      } catch {
        /* keep prior */
      }
    }
    loadConflictCounts()
    const onUpdate = (ev) => {
      const detail = ev?.detail
      if (detail && typeof detail === 'object') {
        setServerConflictErrors(Number(detail.conflictErrors ?? 0))
        return
      }
      loadConflictCounts()
    }
    window.addEventListener(TIMETABLE_CONFLICTS_UPDATED, onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener(TIMETABLE_CONFLICTS_UPDATED, onUpdate)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    let cancelled = false

    async function load() {
      setBellLoading(true)
      try {
        const isHeadteacher = String(userRole || user?.role || '').toLowerCase() === 'headteacher'

        const stored = readStoredTimetableSeason()
        let term = stored?.term || getDefaultTerm()
        let academicYear = stored?.academicYear || getDefaultAcademicYear()

        // Resolve the season that actually has timetable data (e.g. Term 2 with 79 periods
        // vs default Term 1 with a sparse legacy publish).
        try {
          const seasonRes = await sessionFetch('/api/timetable/active-season', {
            credentials: 'include',
            cache: 'no-store',
          })
          if (seasonRes.ok) {
            const season = await seasonRes.json()
            const hintTerm = String(season?.term || '').trim()
            const hintYear = String(season?.academicYear || '').trim()
            const hintTotal = Number(season?.total || 0)
            if (hintTerm && hintYear && hintTotal > 0) {
              // Prefer stored season only when it has comparable data; otherwise follow server hint.
              if (!stored || hintTotal >= 10) {
                const storedProbe = stored
                  ? await sessionFetch(
                      `/api/timetable/view?${new URLSearchParams({
                        term: stored.term,
                        academicYear: stored.academicYear,
                        status: 'published',
                      })}`,
                      { credentials: 'include', cache: 'no-store' }
                    )
                      .then((r) => r.json().catch(() => ({})))
                      .catch(() => ({}))
                  : null
                const storedCount = Array.isArray(storedProbe?.assignments)
                  ? storedProbe.assignments.length
                  : 0
                if (!stored || storedCount < Math.max(10, Math.floor(hintTotal * 0.5))) {
                  term = hintTerm
                  academicYear = hintYear
                  writeStoredTimetableSeason(term, academicYear)
                }
              }
            }
          }
        } catch {
          /* keep defaults */
        }

        let data
        let loadedStatus = 'published'

        if (isHeadteacher) {
          data = await loadFromApi({ term, academicYear, status: 'draft' })
          const draftCount = Array.isArray(data?.assignments) ? data.assignments.length : 0
          if (draftCount > 0) {
            loadedStatus = 'draft'
          } else {
            data = await loadFromApi({ term, academicYear, status: 'published' })
            loadedStatus = 'published'
          }

          // If both server responses are sparse but local persist has a richer grid, keep local.
          const localCount = useTimetableStore.getState().assignments.length
          const serverCount = Array.isArray(data?.assignments) ? data.assignments.length : 0
          if (localCount > serverCount && localCount >= 20) {
            loadedStatus = useTimetableStore.getState().isPublished ? 'published' : 'draft'
          }
        } else {
          data = await loadFromApi({ term, academicYear, status: 'published' })
          if (!data?.assignments?.length) {
            data = await loadFromApi({ term, academicYear, status: 'draft' })
            loadedStatus = data?.assignments?.length ? 'draft' : 'published'
          } else {
            loadedStatus = 'published'
          }
        }
        if (cancelled) return
        setViewStatus(loadedStatus)

        if (isHeadteacher) {
          const [classesRes, colorsRes] = await Promise.all([
            sessionFetch('/api/classes?limit=200', { cache: 'no-store' }),
            sessionFetch('/api/timetable/teacher-colors', {
              credentials: 'include',
              cache: 'no-store',
            }),
          ])
          const classesJson = await classesRes.json().catch(() => ({}))
          const colorsJson = await colorsRes.json().catch(() => ({}))
          if (colorsJson?.map) {
            useTimetableStore.getState().setTeacherColors(colorsJson.map)
          }
          const classList = Array.isArray(classesJson?.data) ? classesJson.data : []
          const mapped = classList.map((c) => ({
            id: String(c.id),
            name: String(c.name || c.className || 'Class'),
            grade: inferClassGrade(c.name, c.yearGroup || c.year_group),
            students: Number(c.studentCount || 0),
            subjects: [],
          }))
          const loadedAssignments = useTimetableStore.getState().assignments
          setWallClasses(filterClassesForWallGrid(mapped, loadedAssignments))
        }
      } finally {
        if (!cancelled) setBellLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [loadFromApi, userRole, user?.role])

  const resolvedRole = String(userRole || user?.role || '').toLowerCase()
  const activeSeason = seasonFromMode(seasonMode)

  const filteredAssignments = useMemo(() => {
    const base = Array.isArray(assignments) ? assignments : []
    const bySeason = base.filter(
      (a) => !a?.season || String(a.season) === activeSeason || activeSeason === 'normal'
    )

    if (resolvedRole === 'student') {
      const classId = String(user?.studentProfile?.classId || '').trim()
      if (!classId) return []
      return bySeason.filter((a) => String(a?.classId) === classId)
    }

    if (resolvedRole === 'teacher' || resolvedRole === 'hod') {
      const teacherUserId = String(user?.id || userId || '').trim()
      if (!teacherUserId) return []
      return bySeason.filter((a) => String(a?.teacherId) === teacherUserId)
    }

    return bySeason
  }, [assignments, activeSeason, resolvedRole, user?.id, user?.studentProfile?.classId, userId])

  const wallTeachers = useMemo(() => {
    const map = new Map()
    for (const a of filteredAssignments) {
      const id = String(a?.teacherId || '').trim()
      if (!id) continue
      if (!map.has(id)) {
        map.set(id, {
          id,
          fullName: String(a?.teacherName || 'Teacher'),
          subjects: [],
          availability: [],
          maxHours: { perWeek: 28 },
          preferences: { minimizeGaps: true, maxTravelLegsPerDay: 1 },
          traveling: { enabled: false, schools: [] },
        })
      }
    }
    return Array.from(map.values())
  }, [filteredAssignments])

  const displayWallClasses = useMemo(() => {
    if (wallClasses.length) return wallClasses
    const map = new Map()
    for (const a of filteredAssignments) {
      const id = String(a?.classId || '').trim()
      if (!id) continue
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: String(a?.className || id),
          grade: inferClassGrade(String(a?.className || '')),
          students: 0,
          subjects: [],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name), undefined, { numeric: true })
    )
  }, [wallClasses, filteredAssignments])

  const todayKey = useMemo(() => {
    if (!mounted) return null
    return dayKeyFromDate(new Date())
  }, [mounted])

  const todaySchedule = useMemo(() => {
    if (!todayKey) return []
    return filteredAssignments
      .filter((a) => String(a?.dayOfWeek) === todayKey && !a?.isBreak)
      .slice()
      .sort((a, b) => hhmmToMinutes(a?.startTime) - hhmmToMinutes(b?.startTime))
      .map((a) => ({
        id: a.id,
        subject: String(a?.subjectName || a?.subjectId || 'Subject'),
        class: String(a?.className || a?.classId || 'Class'),
        teacher: String(a?.teacherName || a?.teacherId || 'Teacher'),
        time: `${a?.startTime || ''}-${a?.endTime || ''}`,
        startTime: a?.startTime,
        period: a?.period,
      }))
  }, [filteredAssignments, todayKey])

  const nextClass = useMemo(() => {
    if (!todayKey || !mounted) return null
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    for (const a of todaySchedule) {
      const start = hhmmToMinutes(a.startTime)
      if (start > currentMinutes) {
        return {
          ...a,
          minutesUntil: start - currentMinutes,
        }
      }
    }
    return null
  }, [todayKey, todaySchedule, mounted])

  const getTimetableLink = () => {
    switch (resolvedRole) {
      case 'student':
        return '/dashboard/timetable/student'
      case 'teacher':
        return '/dashboard/timetable/teacher'
      case 'hod':
        return '/dashboard/hod/timetable'
      case 'headteacher':
        return '/dashboard/headteacher/timetable'
      default:
        return '/dashboard'
    }
  }

  const href = getTimetableLink()

  if (!mounted) {
    return (
      <Card
        className={className}
        role="status"
        aria-busy="true"
        aria-label="Loading timetable summary"
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            <SkeletonLoader variant="text" width="40%" height="24px" />
            <div className="space-y-3">
              <SkeletonLoader variant="rectangular" height="80px" className="rounded-lg" />
              <SkeletonLoader variant="rectangular" height="60px" className="rounded-lg" />
              <SkeletonLoader variant="rectangular" height="60px" className="rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (resolvedRole === 'headteacher') {
    const showingDraft = viewStatus === 'draft' || (!isPublished && assignments.length > 0)
    const status =
      assignments.length === 0
        ? { label: 'Not created', tone: 'text-royalPurple-text3' }
        : serverConflictErrors > 0
          ? {
              label: `${serverConflictErrors} confirmed conflicts`,
              tone: 'text-royalPurple-dangerTx',
            }
          : showingDraft
            ? { label: 'Draft (not published)', tone: 'text-royalPurple-text2' }
            : { label: 'Published', tone: 'text-royalPurple-successTx' }

    const lastChangeAt =
      pendingChanges?.[0]?.at || (lastPublishedAt ? lastPublishedAt.toISOString() : null)
    const updated = timeAgo(lastChangeAt)
    const canPublish =
      serverConflictErrors === 0 && assignments.length > 0 && showingDraft && !publishing

    const publishToServer = async () => {
      if (!canPublish) return
      setPublishing(true)
      try {
        const snap = readTimetableConflictCountsSnapshot()
        const stored = readStoredTimetableSeason()
        const term = String(snap?.term || stored?.term || getDefaultTerm())
        const academicYear = String(
          snap?.academicYear || stored?.academicYear || getDefaultAcademicYear()
        )
        const store = useTimetableStore.getState()
        if (store.assignments.length) {
          const syncRes = await sessionFetch('/api/timetable/entries/sync-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              term,
              academicYear,
              assignments: store.assignments,
              replaceExisting: true,
            }),
          })
          const syncJson = await syncRes.json().catch(() => ({}))
          if (!syncRes.ok) {
            throw new Error(syncJson?.error || 'Could not save draft before publishing')
          }
        }
        const r = await sessionFetch('/api/timetable/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ term, academicYear }),
        })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j?.message || j?.error || 'Failed to publish')
        publish()
        await loadFromApi({ term, academicYear, status: 'published' })
        setViewStatus('published')
        toast.success(`Published ${j.published ?? 0} periods`)
      } catch (e) {
        toast.error(e?.message || 'Failed to publish')
      } finally {
        setPublishing(false)
      }
    }

    return (
      <Card className={`${className} overflow-visible`.trim()}>
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-royalPurple-accentTx" aria-hidden="true" />
              Master Timetable
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-sm font-semibold leading-none ${status.tone}`}>
                {status.label}
              </span>
              <Link href={href} className="inline-flex items-center">
                <Button variant="ghost" size="sm" aria-label="View full timetable">
                  View Full
                  <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-5">
          {showingDraft && assignments.length > 0 ? (
            <p className="text-xs text-royalPurple-text2">
              Showing the editable draft (includes all regenerated departments). Teachers and
              students still see the last published version until you publish.
            </p>
          ) : null}
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-6 text-center">
              <div className="text-royalPurple-text1 font-semibold">
                Master Timetable Not Created
              </div>
              <div className="mt-1 text-sm text-royalPurple-text3">Ready to generate</div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link href={href} className="inline-flex">
                  <Button className="zsms-hover-raise">Generate Now</Button>
                </Link>
              </div>
            </div>
          ) : bellLoading ? (
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-8 text-center text-sm text-royalPurple-text3">
              Loading school bell schedule…
            </div>
          ) : storeTimeSlots.length === 0 ? (
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-8 text-center">
              <div className="text-royalPurple-text1 font-semibold">
                No bell schedule configured
              </div>
              <div className="mt-1 text-sm text-royalPurple-text3">
                Set school hours in Timetable Settings to display the grid.
              </div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link href={href} className="inline-flex">
                  <Button className="zsms-hover-raise">Open Timetable Settings</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-royalPurple-border/40 bg-white p-2 max-h-[520px] overflow-y-auto">
              <AscClassWallGrid
                assignments={filteredAssignments}
                timeSlots={storeTimeSlots}
                classes={displayWallClasses}
                teachers={wallTeachers}
                season={activeSeason}
                showConflicts
                serverConflictErrors={serverConflictErrors}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-royalPurple-border/30 pt-3">
            <div className="text-xs leading-none text-royalPurple-text3 self-center">
              {updated
                ? `Updated: ${updated}`
                : lastPublishedAt
                  ? `Published: ${lastPublishedAt.toLocaleString()}`
                  : ''}
            </div>
            <div className="ml-auto flex items-center gap-3 shrink-0">
              <span className="text-xs leading-none text-royalPurple-text2 whitespace-nowrap self-center">
                Confirmed conflicts: {serverConflictErrors}
              </span>
              <Button
                size="sm"
                onClick={publishToServer}
                disabled={!canPublish}
                className="zsms-hover-raise shrink-0 self-center"
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-royalPurple-accentTx" aria-hidden="true" />
            Today's Schedule
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = href)}
            aria-label="View full timetable"
          >
            View Full
            <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Next Class Alert */}
        {nextClass && (
          <div
            className="mb-4 p-3 bg-royalPurple-success border border-royalPurple-border rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-royalPurple-successTx mr-2" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-sm font-medium text-royalPurple-successTx">
                  <span className="sr-only">Next class: </span>
                  {nextClass.subject} {resolvedRole === 'teacher' && `- ${nextClass.class}`}
                </div>
                <div className="text-xs text-royalPurple-successTx">
                  {nextClass.time} •{' '}
                  {nextClass.minutesUntil < 60
                    ? `${nextClass.minutesUntil}m`
                    : `${Math.floor(nextClass.minutesUntil / 60)}h ${nextClass.minutesUntil % 60}m`}{' '}
                  remaining
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Classes */}
        {todaySchedule.length > 0 ? (
          <ul className="space-y-3" role="list" aria-label="Today's classes">
            {todaySchedule.slice(0, 4).map((cls, index) => (
              <li key={index}>
                <article
                  className="flex items-center p-3 rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 outline-none transition-shadow"
                  style={{
                    borderLeftColor: pastelBgForSubject(cls.subject),
                    borderLeftWidth: '4px',
                  }}
                  tabIndex="0"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-royalPurple-text1 text-sm">
                      {cls.subject} {resolvedRole === 'teacher' && `- ${cls.class}`}
                    </div>
                    <div className="text-xs text-royalPurple-text2 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                      <span className="sr-only">Time: </span>
                      {cls.time} ({cls.period})
                    </div>
                    {resolvedRole !== 'student' ? (
                      <div className="text-xs text-royalPurple-text2 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                        <span className="sr-only">Class: </span>
                        {cls.class}
                      </div>
                    ) : null}
                    {resolvedRole === 'student' && (
                      <div className="text-xs text-royalPurple-text2 flex items-center">
                        <User className="h-3 w-3 mr-1" aria-hidden="true" />
                        <span className="sr-only">Teacher: </span>
                        {cls.teacher}
                      </div>
                    )}
                  </div>
                </article>
              </li>
            ))}
            {todaySchedule.length > 4 && (
              <li className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = href)}
                  aria-label={`View ${todaySchedule.length - 4} more classes`}
                >
                  +{todaySchedule.length - 4} more classes
                </Button>
              </li>
            )}
          </ul>
        ) : (
          <div className="text-center text-royalPurple-text3 py-8" role="status">
            <Calendar
              className="h-12 w-12 mx-auto mb-4 text-royalPurple-text3"
              aria-hidden="true"
            />
            <p className="text-sm">No classes scheduled for today</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
