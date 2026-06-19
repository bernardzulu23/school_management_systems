'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { ArrowLeft, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function DeploymentPage() {
  const [deployments, setDeployments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    teacherId: '',
    tsNumber: '',
    gradeLevel: '',
    subjectSpec: '',
    deployedFrom: '',
    deploymentDate: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [depRes, teachersRes] = await Promise.all([
        sessionFetch('/api/government/deployment'),
        sessionFetch('/api/users?role=teacher'),
      ])
      const depJson = await depRes.json().catch(() => ({}))
      if (!depRes.ok) throw new Error(depJson.error || 'Failed to load deployments')
      setDeployments(depJson.data || [])

      const tJson = await teachersRes.json().catch(() => ({}))
      const list = tJson?.data || tJson?.users || []
      setTeachers(Array.isArray(list) ? list : [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
      setDeployments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = (row) => {
    setEditingId(row?.teacherId || row?.teacher?.id || null)
    setForm({
      teacherId: row?.teacherId || row?.teacher?.id || '',
      tsNumber: row?.tsNumber || row?.teacher?.ts_number || '',
      gradeLevel: row?.gradeLevel || '',
      subjectSpec: Array.isArray(row?.subjectSpec) ? row.subjectSpec.join(', ') : '',
      deployedFrom: row?.deployedFrom || '',
      deploymentDate: row?.deploymentDate
        ? new Date(row.deploymentDate).toISOString().slice(0, 10)
        : '',
    })
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.teacherId) return
    try {
      const payload = {
        teacherId: form.teacherId,
        tsNumber: form.tsNumber || undefined,
        gradeLevel: form.gradeLevel || undefined,
        subjectSpec: form.subjectSpec
          ? form.subjectSpec
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        deployedFrom: form.deployedFrom || undefined,
        deploymentDate: form.deploymentDate || undefined,
      }
      const res = await sessionFetch('/api/government/deployment', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success('Deployment saved')
      setEditingId(null)
      load()
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    }
  }

  const deploymentByTeacher = new Map(deployments.map((d) => [d.teacherId, d]))

  return (
    <DashboardLayout title="Teacher Deployments">
      <FeatureGate featureId="teacher-deployment">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/headteacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => {
                setEditingId('new')
                setForm({
                  teacherId: '',
                  tsNumber: '',
                  gradeLevel: '',
                  subjectSpec: '',
                  deployedFrom: '',
                  deploymentDate: '',
                })
              }}
            >
              Add deployment
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Deployment register
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Teacher</th>
                      <th className="py-2">TSC #</th>
                      <th className="py-2">Grade</th>
                      <th className="py-2">Subjects</th>
                      <th className="py-2">Deployed from</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((t) => {
                      const id = t.id || t.teacherId
                      const dep = deploymentByTeacher.get(id)
                      return (
                        <tr key={id} className="border-b border-royalPurple-border/30">
                          <td className="py-2">{t.name || t.user?.name || '—'}</td>
                          <td className="py-2">{dep?.tsNumber || t.ts_number || '—'}</td>
                          <td className="py-2">{dep?.gradeLevel || '—'}</td>
                          <td className="py-2">
                            {Array.isArray(dep?.subjectSpec) && dep.subjectSpec.length
                              ? dep.subjectSpec.join(', ')
                              : '—'}
                          </td>
                          <td className="py-2">{dep?.deployedFrom || '—'}</td>
                          <td className="py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(dep || { teacherId: id, teacher: t })}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {!teachers.length ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-royalPurple-text3">
                          No teachers found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {editingId ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Deployment record</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={save} className="space-y-3">
                    {editingId === 'new' ? (
                      <select
                        required
                        className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                        value={form.teacherId}
                        onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                      >
                        <option value="">Select teacher</option>
                        {teachers.map((t) => {
                          const id = t.id || t.teacherId
                          return (
                            <option key={id} value={id}>
                              {t.name || t.user?.name}
                            </option>
                          )
                        })}
                      </select>
                    ) : null}
                    <input
                      placeholder="TSC number"
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.tsNumber}
                      onChange={(e) => setForm({ ...form, tsNumber: e.target.value })}
                    />
                    <input
                      placeholder="Grade level (e.g. G8–G12)"
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.gradeLevel}
                      onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                    />
                    <input
                      placeholder="Subject specialisation (comma-separated)"
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.subjectSpec}
                      onChange={(e) => setForm({ ...form, subjectSpec: e.target.value })}
                    />
                    <input
                      placeholder="Deployed from (province/district)"
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.deployedFrom}
                      onChange={(e) => setForm({ ...form, deployedFrom: e.target.value })}
                    />
                    <input
                      type="date"
                      className="w-full p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                      value={form.deploymentDate}
                      onChange={(e) => setForm({ ...form, deploymentDate: e.target.value })}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </FeatureGate>
    </DashboardLayout>
  )
}
