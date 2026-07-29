'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import toast from 'react-hot-toast'

export default function SeniorTeacherAllocationPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [allocations, setAllocations] = useState([])
  const [form, setForm] = useState({
    teacherId: '',
    classId: '',
    subjectId: '',
    periodsPerWeek: 5,
    term: 'Term 1',
    academicYear: String(new Date().getFullYear()),
  })

  async function load() {
    setLoading(true)
    try {
      const [dashboardRes, allocationsRes] = await Promise.all([
        sessionFetch('/api/dashboard/senior-teacher', {
          credentials: 'include',
          cache: 'no-store',
        }),
        sessionFetch('/api/timetable/allocations', { credentials: 'include', cache: 'no-store' }),
      ])
      const [dashboardJson, allocationsJson] = await Promise.all([
        dashboardRes.json().catch(() => ({})),
        allocationsRes.json().catch(() => ({})),
      ])
      if (!dashboardRes.ok || !dashboardJson?.success)
        throw new Error('Failed to load primary data')
      if (!allocationsRes.ok)
        throw new Error(allocationsJson?.error || 'Failed to load allocations')
      setDashboardData(dashboardJson.data)
      setAllocations(Array.isArray(allocationsJson?.allocations) ? allocationsJson.allocations : [])
    } catch (error) {
      toast.error(error?.message || 'Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const classes = useMemo(() => dashboardData?.classes || [], [dashboardData])
  const teachers = useMemo(() => dashboardData?.teachers || [], [dashboardData])
  const subjects = useMemo(() => dashboardData?.subjects || [], [dashboardData])

  useEffect(() => {
    if (!teachers.length || !classes.length || !subjects.length) return
    setForm((current) => ({
      ...current,
      teacherId: current.teacherId || String(teachers[0]?.userId || ''),
      classId: current.classId || String(classes[0]?.id || ''),
      subjectId: current.subjectId || String(subjects[0]?.id || ''),
    }))
  }, [teachers, classes, subjects])

  const filteredAllocations = useMemo(() => {
    const year = String(form.academicYear || '')
    const term = String(form.term || '')
    return allocations.filter(
      (row) => String(row?.academicYear || '') === year && String(row?.term || '') === term
    )
  }, [allocations, form.academicYear, form.term])

  async function saveAllocation() {
    setSaving(true)
    try {
      const res = await sessionFetch('/api/timetable/allocations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          periodsPerWeek: Number(form.periodsPerWeek || 0),
          blockType: 'MIXED',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save allocation')
      toast.success('Allocation saved')
      await load()
    } catch (error) {
      toast.error(error?.message || 'Failed to save allocation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Primary Class Allocation">
      <div className="space-y-6">
        <Card className="bg-royalPurple-card border border-royalPurple-border2">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Assign teacher load</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <label className="space-y-2 text-sm text-royalPurple-text2">
              <span>Teacher</span>
              <select
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-royalPurple-text1"
                value={form.teacherId}
                onChange={(e) => setForm((current) => ({ ...current, teacherId: e.target.value }))}
              >
                {teachers.map((teacher) => (
                  <option key={teacher.userId} value={teacher.userId}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-royalPurple-text2">
              <span>Class</span>
              <select
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-royalPurple-text1"
                value={form.classId}
                onChange={(e) => setForm((current) => ({ ...current, classId: e.target.value }))}
              >
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-royalPurple-text2">
              <span>Subject</span>
              <select
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-royalPurple-text1"
                value={form.subjectId}
                onChange={(e) => setForm((current) => ({ ...current, subjectId: e.target.value }))}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-royalPurple-text2">
              <span>Periods per week</span>
              <input
                type="number"
                min="1"
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-royalPurple-text1"
                value={form.periodsPerWeek}
                onChange={(e) =>
                  setForm((current) => ({ ...current, periodsPerWeek: Number(e.target.value) }))
                }
              />
            </label>

            <label className="space-y-2 text-sm text-royalPurple-text2">
              <span>Term</span>
              <select
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-royalPurple-text1"
                value={form.term}
                onChange={(e) => setForm((current) => ({ ...current, term: e.target.value }))}
              >
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-royalPurple-text2">
              <span>Academic year</span>
              <input
                type="text"
                className="w-full rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-royalPurple-text1"
                value={form.academicYear}
                onChange={(e) =>
                  setForm((current) => ({ ...current, academicYear: e.target.value }))
                }
              />
            </label>

            <div className="md:col-span-2 xl:col-span-3">
              <Button onClick={saveAllocation} disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save Allocation'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-royalPurple-card border border-royalPurple-border2">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Current primary allocations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-royalPurple-text2">Loading allocations...</p>
            ) : filteredAllocations.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No allocations found for this term.</p>
            ) : (
              filteredAllocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="rounded-xl border border-royalPurple-border bg-royalPurple-card2 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-royalPurple-text1">
                      {allocation.class?.name} · {allocation.subject?.name}
                    </p>
                    <p className="text-sm text-royalPurple-text2">
                      {allocation.teacher?.name || 'Teacher'} · {allocation.periodsPerWeek}{' '}
                      periods/week
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-royalPurple-muted/60 text-royalPurple-text1">
                    {String(allocation.status || 'draft').toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
