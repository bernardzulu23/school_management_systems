'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar, Plus } from 'lucide-react'
import { Label } from '@/components/ui/label'

function expandRange(start, end) {
  const s = Number(start)
  if (!Number.isFinite(s) || s < 1) return []
  const e = Number.isFinite(Number(end)) ? Number(end) : s
  const lo = Math.min(s, e)
  const hi = Math.max(s, e)
  const out = []
  for (let w = lo; w <= hi; w++) out.push(w)
  return out
}

export default function TeacherAssessmentCalendarPage() {
  const [assignments, setAssignments] = useState([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [assessments, setAssessments] = useState([])
  const [schemeEvents, setSchemeEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const selectedAssignment = useMemo(
    () => assignments.find((a) => String(a.id) === String(selectedAssignmentId)) || null,
    [assignments, selectedAssignmentId]
  )

  useEffect(() => {
    async function loadAssignments() {
      try {
        const res = await fetch('/api/teaching-assignments', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        const data = Array.isArray(json?.data) ? json.data : []
        setAssignments(data)
        if (data.length > 0) setSelectedAssignmentId((prev) => prev || String(data[0].id))
      } catch {
        toast.error('Failed to load teaching assignments')
      }
    }
    loadAssignments()
  }, [])

  useEffect(() => {
    async function loadAssessmentsAndSchemes() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('limit', '200')
        if (selectedAssignment?.classId) params.set('classId', selectedAssignment.classId)
        if (selectedAssignment?.subjectName) params.set('subject', selectedAssignment.subjectName)

        const [assessRes, schemeRes] = await Promise.all([
          fetch(`/api/assessments?${params.toString()}`, { credentials: 'include' }),
          fetch('/api/curriculum/scheme', { credentials: 'include' }),
        ])
        const assessJson = await assessRes.json().catch(() => ({}))
        if (!assessRes.ok) throw new Error(assessJson?.error || 'Failed to load assessments')
        const data = Array.isArray(assessJson?.data) ? assessJson.data : []
        setAssessments(data)

        const schemeJson = await schemeRes.json().catch(() => ({}))
        const schemes = Array.isArray(schemeJson?.data) ? schemeJson.data : []
        const subjectHint = String(selectedAssignment?.subjectName || '')
          .toLowerCase()
          .trim()
        const relevant = schemes.filter((s) => {
          if (!subjectHint) return true
          return String(s.subject || '')
            .toLowerCase()
            .includes(subjectHint)
        })

        const events = []
        for (const scheme of relevant) {
          const schedule = scheme.testSchedule || {}
          for (const week of expandRange(schedule.midTermWeek, schedule.midTermWeekEnd)) {
            events.push({
              id: `${scheme.id}-mid-${week}`,
              kind: 'scheme_mid_term',
              title: `${scheme.subject} · Mid-term (Week ${week})`,
              subtitle: `${scheme.gradeOrForm} · ${scheme.term} ${scheme.year}`,
              date: schedule.midTermDate || null,
              week,
              schemeId: scheme.id,
            })
          }
          for (const week of expandRange(schedule.endOfTermWeek, schedule.endOfTermWeekEnd)) {
            events.push({
              id: `${scheme.id}-eot-${week}`,
              kind: 'scheme_end_of_term',
              title: `${scheme.subject} · End-of-term (Week ${week})`,
              subtitle: `${scheme.gradeOrForm} · ${scheme.term} ${scheme.year}`,
              date: schedule.endOfTermDate || null,
              week,
              schemeId: scheme.id,
            })
          }
        }
        setSchemeEvents(events)
      } catch (e) {
        toast.error(e?.message || 'Failed to load calendar')
        setAssessments([])
        setSchemeEvents([])
      } finally {
        setLoading(false)
      }
    }
    loadAssessmentsAndSchemes()
  }, [selectedAssignment])

  const grouped = useMemo(() => {
    const assessmentItems = assessments.map((a) => ({
      id: a.id,
      kind: 'assessment',
      title: a.title,
      subtitle: `${a.subject} • ${a.class} • ${String(a.type || '').toUpperCase()}`,
      date: a.date,
      sortKey: new Date(a.date).getTime() || 0,
    }))
    const schemeItems = schemeEvents.map((e) => ({
      ...e,
      sortKey: e.date ? new Date(e.date).getTime() : Number(e.week || 0) * 1e6,
    }))
    const list = [...assessmentItems, ...schemeItems].sort((a, b) => a.sortKey - b.sortKey)
    const map = new Map()
    list.forEach((item) => {
      let key = 'planned'
      if (item.date) {
        const d = new Date(item.date)
        if (!Number.isNaN(d.getTime())) {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        }
      } else if (item.week) {
        key = `scheme-week`
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
  }, [assessments, schemeEvents])

  return (
    <DashboardLayout userRole="teacher" title="Assessment Calendar">
      <div className="space-y-6">
        <Link
          href="/dashboard/teacher/assessments"
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-royalPurple-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Link>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Assessment Calendar
            </CardTitle>
            <p className="text-sm text-royalPurple-text2">
              Created assessments plus mid-term / end-of-term slots from your schemes of work.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="space-y-2">
                <Label>Filter by Teaching Assignment</Label>
                <select
                  className="w-full bg-royalPurple-deep border border-royalPurple-border rounded-lg p-3 text-royalPurple-text1"
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                >
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.className} • {a.subjectName}
                    </option>
                  ))}
                </select>
              </div>
              <Link
                href="/dashboard/teacher/assessments?create=1"
                className="inline-flex items-center rounded-md bg-royalPurple-accent px-4 py-2 text-sm font-semibold text-royalPurple-text1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Link>
            </div>

            {loading ? (
              <p className="text-royalPurple-text2">Loading...</p>
            ) : grouped.length === 0 ? (
              <p className="text-royalPurple-text2">
                No assessments or scheme test weeks found. Generate a scheme in Teaching Studio or
                create an assessment.
              </p>
            ) : (
              <div className="space-y-6">
                {grouped.map((g) => {
                  let heading = 'Scheme planned assessments'
                  if (g.key !== 'planned' && g.key !== 'scheme-week') {
                    const [year, month] = g.key.split('-')
                    heading = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
                      'en-US',
                      { month: 'long', year: 'numeric' }
                    )
                  }
                  return (
                    <div key={g.key} className="space-y-3">
                      <div className="text-royalPurple-text1 font-bold">{heading}</div>
                      <div className="space-y-2">
                        {g.items.map((a) => (
                          <div
                            key={a.id}
                            className="p-4 rounded-xl border border-royalPurple-border bg-royalPurple-card/60 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-royalPurple-text1 font-semibold truncate">
                                {a.title}
                              </div>
                              <div className="text-sm text-royalPurple-text2">{a.subtitle}</div>
                              {a.kind?.startsWith('scheme_') ? (
                                <Link
                                  href={`/dashboard/teacher/assessments?create=1&schemeId=${encodeURIComponent(a.schemeId || '')}`}
                                  className="text-xs font-semibold text-royalPurple-accentTx hover:underline"
                                >
                                  Create from this scheme slot →
                                </Link>
                              ) : null}
                            </div>
                            <div className="text-sm text-royalPurple-text2">
                              {a.date
                                ? new Date(a.date).toLocaleString()
                                : a.week
                                  ? `Scheme week ${a.week}`
                                  : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
