'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { Briefcase, UserPlus, Trash2 } from 'lucide-react'
import { formatGuidanceScopeLabel } from '@/lib/guidance/guidanceAccess'

const SCOPES = [
  { value: 'ALL', label: 'All pupils' },
  { value: 'JUNIOR', label: 'Junior (Grades 1–9)' },
  { value: 'SENIOR', label: 'Senior (Grades 10–12)' },
]

export default function GuidanceTeachersAdminPage() {
  const [assignments, setAssignments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teacherId, setTeacherId] = useState('')
  const [scope, setScope] = useState('ALL')
  const [canManageReEntry, setCanManageReEntry] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [assignRes, teacherRes] = await Promise.all([
        fetch('/api/guidance/assignments', { credentials: 'include' }),
        fetch('/api/users?role=teacher', { credentials: 'include' }),
      ])
      const assignJson = await assignRes.json().catch(() => ({}))
      const teacherJson = await teacherRes.json().catch(() => ({}))
      if (!assignRes.ok) throw new Error(assignJson.error || 'Failed to load assignments')
      if (!teacherRes.ok) throw new Error(teacherJson.error || 'Failed to load teachers')
      setAssignments(assignJson.data || [])
      setTeachers(teacherJson.data || [])
    } catch (error) {
      toast.error(error.message || 'Could not load guidance teachers')
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
      const res = await fetch('/api/guidance/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teacherId: selected.teacherId, scope, canManageReEntry }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Assignment failed')
      toast.success('Guidance teacher assigned')
      setTeacherId('')
      setScope('ALL')
      setCanManageReEntry(false)
      await load()
    } catch (error) {
      toast.error(error.message || 'Could not assign guidance teacher')
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (assignmentId) => {
    if (!window.confirm('Remove this guidance teacher assignment?')) return
    try {
      const res = await fetch(`/api/guidance/assignments/${assignmentId}`, {
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
    <DashboardLayout title="Guidance teachers">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-royalPurple-accentTx" />
            Guidance teachers
          </h1>
          <p className="text-royalPurple-text2 mt-1">
            Assign teachers to manage career clusters, careers, and (when enabled) confidential
            guidance cases. Teachers keep their main teacher account and switch to the guidance
            dashboard from the header.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assign guidance teacher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="block text-sm">
                <span className="text-royalPurple-text2">Scope</span>
                <select
                  className="mt-1 w-full rounded-lg border border-royalPurple-border bg-royalPurple-card1 px-3 py-2"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  {SCOPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-royalPurple-text2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={canManageReEntry}
                  onChange={(e) => setCanManageReEntry(e.target.checked)}
                />
                Allow girls re-entry records (restricted — enable only for designated staff)
              </label>
            </div>
            <Button onClick={assignTeacher} disabled={saving || !teacherId}>
              <UserPlus className="h-4 w-4 mr-2" />
              {saving ? 'Assigning…' : 'Assign'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : assignments.length === 0 ? (
              <p className="text-royalPurple-text2 text-sm">No guidance teachers assigned yet.</p>
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
                      <p className="text-sm text-royalPurple-text2">
                        {assignment.user?.email} · {formatGuidanceScopeLabel(assignment.scope)}
                        {assignment.canManageReEntry ? ' · Re-entry enabled' : ''}
                      </p>
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
