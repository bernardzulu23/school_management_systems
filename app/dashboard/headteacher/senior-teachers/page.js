'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import toast from 'react-hot-toast'

export default function HeadteacherSeniorTeachersPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teachers, setTeachers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [teacherId, setTeacherId] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [teachersRes, assignmentsRes] = await Promise.all([
        sessionFetch('/api/users?role=teacher', { credentials: 'include', cache: 'no-store' }),
        sessionFetch('/api/senior-teachers/assignments', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])
      const [teachersJson, assignmentsJson] = await Promise.all([
        teachersRes.json().catch(() => ({})),
        assignmentsRes.json().catch(() => ({})),
      ])
      if (!teachersRes.ok) throw new Error(teachersJson?.error || 'Failed to load teachers')
      if (!assignmentsRes.ok) {
        throw new Error(assignmentsJson?.error || 'Failed to load Senior Teacher assignments')
      }
      const teacherRows = Array.isArray(teachersJson?.data) ? teachersJson.data : []
      const assignmentRows = Array.isArray(assignmentsJson?.data) ? assignmentsJson.data : []
      setTeachers(teacherRows)
      setAssignments(assignmentRows)
      if (teacherRows.length > 0)
        setTeacherId((current) => current || String(teacherRows[0]?.teacherId || ''))
    } catch (error) {
      toast.error(error?.message || 'Failed to load Senior Teacher page')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function assign() {
    if (!teacherId) return
    setSaving(true)
    try {
      const res = await sessionFetch('/api/senior-teachers/assignments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to assign Senior Teacher')
      toast.success('Senior Teacher assigned')
      await load()
    } catch (error) {
      toast.error(error?.message || 'Failed to assign Senior Teacher')
    } finally {
      setSaving(false)
    }
  }

  async function revoke(assignmentId) {
    setSaving(true)
    try {
      const res = await sessionFetch('/api/senior-teachers/assignments', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to revoke assignment')
      toast.success('Senior Teacher assignment revoked')
      await load()
    } catch (error) {
      toast.error(error?.message || 'Failed to revoke assignment')
    } finally {
      setSaving(false)
    }
  }

  const availableTeachers = teachers.filter((teacher) => Boolean(teacher.teacherId))

  return (
    <DashboardLayout title="Senior Teachers">
      <div className="space-y-6">
        <Card className="bg-royalPurple-card border border-royalPurple-border2">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Assign Senior Teachers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-royalPurple-text2">
              Senior Teachers oversee all primary classes, lesson plans, exercises, and class
              allocations.
            </p>
            <div className="flex flex-col md:flex-row gap-3">
              <select
                className="flex-1 rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-royalPurple-text1"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={loading || saving}
              >
                {availableTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.teacherId}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
              <Button onClick={assign} disabled={!teacherId || loading || saving}>
                {saving ? 'Saving...' : 'Assign Senior Teacher'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-royalPurple-card border border-royalPurple-border2">
          <CardHeader>
            <CardTitle className="text-royalPurple-text1">Active assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-royalPurple-text2">Loading assignments...</p>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-royalPurple-text2">No Senior Teachers assigned yet.</p>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-royalPurple-border bg-royalPurple-card2 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-royalPurple-text1">
                      {assignment.user?.name || assignment.user?.email || 'Teacher'}
                    </p>
                    <p className="text-sm text-royalPurple-text2">
                      Assigned by {assignment.assignedBy?.name || 'Headteacher'}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => revoke(assignment.id)} disabled={saving}>
                    Revoke
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
