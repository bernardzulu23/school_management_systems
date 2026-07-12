'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { UserPlus, Trash2, GraduationCap } from 'lucide-react'

export default function SicAssignmentAdminPage() {
  const [assignments, setAssignments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teacherId, setTeacherId] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const [assignRes, teacherRes] = await Promise.all([
        fetch('/api/sic/assignments', { credentials: 'include' }),
        fetch('/api/users?role=teacher', { credentials: 'include' }),
      ])
      const assignJson = await assignRes.json().catch(() => ({}))
      const teacherJson = await teacherRes.json().catch(() => ({}))
      if (!assignRes.ok) throw new Error(assignJson.error || 'Failed to load SIC assignments')
      if (!teacherRes.ok) throw new Error(teacherJson.error || 'Failed to load teachers')
      setAssignments(assignJson.data || [])
      setTeachers(teacherJson.data || [])
    } catch (error) {
      toast.error(error.message || 'Could not load SIC assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const assignedUserIds = new Set(assignments.map((a) => a.userId))
  const availableTeachers = teachers.filter((t) => t.teacherId && !assignedUserIds.has(t.id))

  const assignTeacher = async () => {
    const selected = availableTeachers.find((t) => t.teacherId === teacherId)
    if (!selected?.teacherId) {
      toast.error('Select a teacher')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/sic/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teacherId: selected.teacherId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Assignment failed')
      toast.success('School In-service Coordinator assigned')
      setTeacherId('')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not assign SIC')
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (assignmentId) => {
    if (!window.confirm('Remove this SIC assignment?')) return
    try {
      const res = await fetch(`/api/sic/assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Revoke failed')
      toast.success('Assignment removed')
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not revoke assignment')
    }
  }

  return (
    <DashboardLayout title="School In-service Coordinator">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-royalPurple-accentTx" />
            School In-service Coordinator (SIC)
          </h1>
          <p className="text-royalPurple-text2 mt-1">
            Assign a teacher to chair CPD and HIM for the school. They keep their teacher account
            and open the SIC dashboard from the header.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assign SIC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block text-sm">
              <span className="text-royalPurple-text2">Teacher</span>
              <select
                className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Select teacher…</option>
                {availableTeachers.map((t) => (
                  <option key={t.id} value={t.teacherId}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={assignTeacher} disabled={saving || !teacherId}>
              <UserPlus className="h-4 w-4 mr-2" />
              {saving ? 'Assigning…' : 'Assign'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current SIC</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : assignments.length === 0 ? (
              <p className="text-royalPurple-text2 text-sm">No SIC assigned yet.</p>
            ) : (
              <ul className="divide-y divide-royalPurple-border">
                {assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-medium text-royalPurple-text1">
                        {assignment.user?.name || 'Teacher'}
                      </p>
                      <p className="text-sm text-royalPurple-text2">{assignment.user?.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => revoke(assignment.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
