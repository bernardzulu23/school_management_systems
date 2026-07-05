'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Calendar, Plus } from 'lucide-react'
import { Label } from '@/components/ui/label'

export default function TeacherAssessmentCalendarPage() {
  const [assignments, setAssignments] = useState([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [assessments, setAssessments] = useState([])
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
    async function loadAssessments() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('limit', '200')
        if (selectedAssignment?.classId) params.set('classId', selectedAssignment.classId)
        if (selectedAssignment?.subjectName) params.set('subject', selectedAssignment.subjectName)

        const res = await fetch(`/api/assessments?${params.toString()}`, { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed to load assessments')
        const data = Array.isArray(json?.data) ? json.data : []
        setAssessments(data)
      } catch (e) {
        toast.error(e?.message || 'Failed to load assessments')
        setAssessments([])
      } finally {
        setLoading(false)
      }
    }
    loadAssessments()
  }, [selectedAssignment])

  const grouped = useMemo(() => {
    const list = [...assessments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const map = new Map()
    list.forEach((a) => {
      const d = new Date(a.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    })
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
  }, [assessments])

  return (
    <DashboardLayout userRole="teacher" title="Assessment Calendar">
      <div className="space-y-6">
        <Button asChild variant="outline">
          <Link href="/dashboard/teacher/assessments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Link>
        </Button>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Assessment Calendar
            </CardTitle>
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
              <Button asChild>
                <Link href="/dashboard/teacher/assessments?create=1">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assessment
                </Link>
              </Button>
            </div>

            {loading ? (
              <p className="text-royalPurple-text2">Loading...</p>
            ) : grouped.length === 0 ? (
              <p className="text-royalPurple-text2">No assessments found.</p>
            ) : (
              <div className="space-y-6">
                {grouped.map((g) => {
                  const [year, month] = g.key.split('-')
                  const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
                    'en-US',
                    {
                      month: 'long',
                      year: 'numeric',
                    }
                  )
                  return (
                    <div key={g.key} className="space-y-3">
                      <div className="text-royalPurple-text1 font-bold">{monthName}</div>
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
                              <div className="text-sm text-royalPurple-text2">
                                {a.subject} • {a.class} • {String(a.type || '').toUpperCase()}
                              </div>
                            </div>
                            <div className="text-sm text-royalPurple-text2">
                              {new Date(a.date).toLocaleString()}
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
