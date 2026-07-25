'use client'

/**
 * Lesson session attendance — mirrors desktop SessionAttendancePage
 * (/dashboard/attendance/sessions) using /api/mobile/attendance/sessions/*.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, Clock, Loader2, Play, Square, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { apiSessionFetch } from '@/lib/auth/apiFetch'

const STATUSES = ['present', 'absent', 'late', 'excused']

export default function LessonSessionsPage() {
  const [assignments, setAssignments] = useState([])
  const [openSessions, setOpenSessions] = useState([])
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [periodLabel, setPeriodLabel] = useState('Period 1')
  const [activeSession, setActiveSession] = useState(null)
  const [roster, setRoster] = useState([])
  const [marks, setMarks] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiSessionFetch('/api/teaching-assignments')
        const json = await res.json().catch(() => ({}))
        if (!cancelled) {
          setAssignments(Array.isArray(json?.data) ? json.data : [])
        }
      } catch {
        if (!cancelled) setAssignments([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const classes = useMemo(() => {
    const map = new Map()
    for (const a of assignments) {
      const id = a.classId || a.class_id
      if (!id) continue
      map.set(String(id), a.className || a.class_name || id)
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [assignments])

  const subjectsForClass = useMemo(() => {
    return assignments
      .filter((a) => String(a.classId || a.class_id) === String(classId))
      .map((a) => ({
        id: String(a.subjectId || a.subject_id || ''),
        name: a.subjectName || a.subject_name || a.subjectId || a.subject_id,
      }))
      .filter((s) => s.id)
  }, [assignments, classId])

  const loadOpenSessions = useCallback(async () => {
    try {
      const res = await apiSessionFetch('/api/mobile/attendance/sessions?status=OPEN')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load sessions')
      setOpenSessions(Array.isArray(json.data) ? json.data : [])
    } catch (err) {
      toast.error(String(err?.message || err))
      setOpenSessions([])
    }
  }, [])

  useEffect(() => {
    loadOpenSessions()
  }, [loadOpenSessions])

  const loadRoster = async (cid, sid) => {
    try {
      const params = new URLSearchParams({ classId: cid })
      if (sid) params.set('subjectId', sid)
      const res = await apiSessionFetch(`/api/mobile/class-roster?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load roster')
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
      setRoster(
        list.map((s) => ({
          id: s.id || s.serverId || s.localId,
          name: s.name || s.displayName || s.display_name || 'Student',
        }))
      )
      const initial = {}
      for (const s of list) {
        const id = s.id || s.serverId || s.localId
        if (id) initial[id] = 'present'
      }
      setMarks(initial)
    } catch (err) {
      toast.error(String(err?.message || err))
      setRoster([])
    }
  }

  const openSession = async () => {
    if (!classId || !subjectId) {
      toast.error('Select class and subject')
      return
    }
    setLoading(true)
    try {
      const res = await apiSessionFetch('/api/mobile/attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          subjectId,
          periodLabel,
          term: 1,
          academicYear: String(new Date().getFullYear()),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not open session')
      setActiveSession(json.data)
      toast.success('Lesson session opened')
      await loadOpenSessions()
      await loadRoster(classId, subjectId)
    } catch (err) {
      toast.error(String(err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  const selectSession = async (session) => {
    setActiveSession(session)
    setClassId(session.classId)
    setSubjectId(session.subjectId)
    await loadRoster(session.classId, session.subjectId)
    const existing = {}
    for (const m of session.marks || []) {
      existing[m.studentId] = String(m.status || 'present').toLowerCase()
    }
    if (Object.keys(existing).length) setMarks((prev) => ({ ...prev, ...existing }))
  }

  const markStudent = async (studentId, status) => {
    if (!activeSession?.id) return
    setMarks((prev) => ({ ...prev, [studentId]: status }))
    try {
      const res = await apiSessionFetch(
        `/api/mobile/attendance/sessions/${encodeURIComponent(activeSession.id)}/marks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            method: 'MANUAL',
            status,
          }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Mark failed')
    } catch (err) {
      toast.error(String(err?.message || err))
    }
  }

  const closeSession = async () => {
    if (!activeSession?.id) return
    setLoading(true)
    try {
      const res = await apiSessionFetch(
        `/api/mobile/attendance/sessions/${encodeURIComponent(activeSession.id)}/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sendAbsentSms: true }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Close failed')
      toast.success('Session closed — absent SMS queued by server')
      setActiveSession(null)
      setRoster([])
      await loadOpenSessions()
    } catch (err) {
      toast.error(String(err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Lesson sessions">
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/attendance">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Daily register
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
            <Clock className="h-7 w-7" />
            Lesson sessions
          </h1>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900">
          Per-lesson attendance (mobile API). Parent SMS for absent/late runs when the session
          closes.
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open new session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="lesson-session-class">Class</Label>
                <select
                  id="lesson-session-class"
                  className="w-full p-2 border rounded-md bg-background"
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value)
                    setSubjectId('')
                  }}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="lesson-session-subject">Subject</Label>
                <select
                  id="lesson-session-subject"
                  className="w-full p-2 border rounded-md bg-background"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!classId}
                >
                  <option value="">Select subject</option>
                  {subjectsForClass.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="lesson-session-period">Period</Label>
                <input
                  id="lesson-session-period"
                  className="w-full p-2 border rounded-md"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                />
              </div>
              <Button onClick={openSession} disabled={loading || !classId || !subjectId}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Start session
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {openSessions.length === 0 ? (
                <p className="text-sm text-royalPurple-text2">No open sessions.</p>
              ) : (
                <ul className="space-y-2">
                  {openSessions.map((s) => (
                    <li key={s.id}>
                      <Button
                        variant={activeSession?.id === s.id ? 'primary' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => selectSession(s)}
                      >
                        {s.class?.name || s.classId} — {s.subject?.name || s.subjectId}
                        <span className="ml-auto text-xs opacity-70">{s.periodLabel}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {activeSession ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Marking — session {String(activeSession.id).slice(0, 8)}…
              </CardTitle>
              <Button variant="destructive" size="sm" onClick={closeSession} disabled={loading}>
                <Square className="h-4 w-4 mr-1" />
                Close session
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {roster.map((student) => (
                  <li
                    key={student.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="font-medium">{student.name}</span>
                    <div className="flex gap-1 flex-wrap">
                      {STATUSES.map((st) => (
                        <Button
                          key={st}
                          size="sm"
                          variant={marks[student.id] === st ? 'primary' : 'outline'}
                          onClick={() => markStudent(student.id, st)}
                        >
                          {marks[student.id] === st ? <Check className="h-3 w-3 mr-1" /> : null}
                          {st}
                        </Button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
