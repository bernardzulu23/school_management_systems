'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { FeatureGate } from '@/components/FeatureGate'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function SiblingGroupsPage() {
  const [groups, setGroups] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState([])
  const [discount, setDiscount] = useState('0.10')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/fees/siblings')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load groups')
      setGroups(json.groups || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api.getStudents({ limit: 500 }).then((res) => {
      setStudents(res.data?.data || res.data || [])
    })
  }, [load])

  const toggleStudent = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (selected.length < 2) {
      toast.error('Select at least 2 students')
      return
    }
    try {
      const res = await sessionFetch('/api/fees/siblings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selected, discount: Number(discount) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to create group')
      toast.success('Sibling group created')
      setShowForm(false)
      setSelected([])
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed to save')
    }
  }

  const studentList = Array.isArray(students) ? students : []

  return (
    <DashboardLayout title="Sibling Groups">
      <FeatureGate featureId="fee-management">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
            <Button size="sm" className="ml-auto" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create group
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            groups.map((g) => (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Group ({g.members?.length || 0} students)
                    </span>
                    <span className="text-sm font-normal text-royalPurple-text2">
                      {(Number(g.discount) * 100).toFixed(0)}% discount
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    {(g.members || []).map((m) => (
                      <li key={m.id}>
                        {m.student?.name} ({m.student?.class})
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}

          {!loading && !groups.length ? (
            <p className="text-royalPurple-text3 text-center py-8">No sibling groups yet.</p>
          ) : null}

          {showForm ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Create sibling group</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submit} className="space-y-3">
                    <label className="text-sm block">
                      Discount rate (e.g. 0.10 = 10%)
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        className="w-full mt-1 p-2 border border-royalPurple-border rounded-md bg-royalPurple-card"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-royalPurple-border rounded-md p-2 space-y-1">
                      {studentList.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected.includes(s.id)}
                            onChange={() => toggleStudent(s.id)}
                          />
                          {s.name} ({s.class})
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save group</Button>
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
