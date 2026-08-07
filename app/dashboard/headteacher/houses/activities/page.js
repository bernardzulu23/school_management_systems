'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FeatureGate } from '@/components/FeatureGate'
import { PrimaryOnlyRouteGuard } from '@/components/auth/PrimaryOnlyRouteGuard'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import {
  PRIMARY_HOUSE_ACTIVITY_LABELS,
  PRIMARY_HOUSE_ACTIVITY_TYPES,
  WEEK_DAY_LABELS,
  WEEK_DAYS,
} from '@/lib/activities/helpers'
import { ArrowLeft, Plus, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'

function HouseActivitiesInner() {
  const [tab, setTab] = useState(PRIMARY_HOUSE_ACTIVITY_TYPES[0])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [scheduleDays, setScheduleDays] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [assignScope, setAssignScope] = useState('all')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sessionFetch('/api/activities?includeInactive=false')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to load activities')
      setActivities(Array.isArray(json.data) ? json.data : [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load activities')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(
    () =>
      activities.filter((a) => String(a.type) === tab || (tab === 'sports' && a.type === 'sport')),
    [activities, tab]
  )

  const selected = filtered.find((a) => a.id === selectedId) || filtered[0] || null

  useEffect(() => {
    if (selected?.id) setSelectedId(selected.id)
  }, [selected?.id])

  const toggleDay = (day) => {
    setScheduleDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const createActivity = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      const res = await sessionFetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type: tab,
          scheduleDays,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to create')
      toast.success('Activity created')
      setTitle('')
      setScheduleDays([])
      await load()
    } catch (err) {
      toast.error(err?.message || 'Failed to create activity')
    } finally {
      setBusy(false)
    }
  }

  const saveSchedule = async () => {
    if (!selected?.id) return
    setBusy(true)
    try {
      const res = await sessionFetch(`/api/activities/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleDays: selected.scheduleDays || [] }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to save schedule')
      toast.success('Weekly schedule saved')
      await load()
    } catch (err) {
      toast.error(err?.message || 'Failed to save schedule')
    } finally {
      setBusy(false)
    }
  }

  const patchSelectedDays = (day) => {
    if (!selected) return
    const current = Array.isArray(selected.scheduleDays) ? selected.scheduleDays : []
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    setActivities((prev) =>
      prev.map((a) => (a.id === selected.id ? { ...a, scheduleDays: next } : a))
    )
  }

  const assignOne = async (e) => {
    e.preventDefault()
    if (!selected?.id || !studentId.trim()) return
    setBusy(true)
    try {
      const res = await sessionFetch(`/api/activities/${selected.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to assign')
      toast.success('Pupil assigned')
      setStudentId('')
      await load()
    } catch (err) {
      toast.error(err?.message || 'Failed to assign pupil')
    } finally {
      setBusy(false)
    }
  }

  const assignBulk = async () => {
    if (!selected?.id) return
    setBusy(true)
    try {
      const res = await sessionFetch(`/api/activities/${selected.id}/assign-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: assignScope }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || json.message || 'Bulk assign failed')
      toast.success(`Assigned ${json.added ?? 0} pupils`)
      await load()
    } catch (err) {
      toast.error(err?.message || 'Bulk assign failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/headteacher/houses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inter-house
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRIMARY_HOUSE_ACTIVITY_TYPES.map((type) => (
          <Button
            key={type}
            size="sm"
            variant={tab === type ? 'default' : 'outline'}
            onClick={() => setTab(type)}
          >
            {PRIMARY_HOUSE_ACTIVITY_LABELS[type]}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create {PRIMARY_HOUSE_ACTIVITY_LABELS[tab]}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createActivity} className="space-y-4">
              <div>
                <Label htmlFor="activity-title">Name</Label>
                <Input
                  id="activity-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Football, Gardening club"
                />
              </div>
              <div>
                <Label>Weekly days</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={scheduleDays.includes(day) ? 'default' : 'outline'}
                      onClick={() => toggleDay(day)}
                    >
                      {WEEK_DAY_LABELS[day].slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={busy || !title.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Create activity
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {PRIMARY_HOUSE_ACTIVITY_LABELS[tab]} list ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-royalPurple-text3">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-royalPurple-text3">No activities yet for this type.</p>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selected?.id === a.id
                      ? 'border-royalPurple-accent bg-royalPurple-card2'
                      : 'border-royalPurple-border'
                  }`}
                  onClick={() => setSelectedId(a.id)}
                >
                  <span className="font-medium">{a.title}</span>
                  <span className="block text-xs text-royalPurple-text3">
                    {(a.scheduleDays || [])
                      .map((d) => WEEK_DAY_LABELS[d]?.slice(0, 3) || d)
                      .join(', ') || 'No days set'}{' '}
                    · {a.participantCount || 0} pupils
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage: {selected.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Weekly calendar</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    size="sm"
                    variant={(selected.scheduleDays || []).includes(day) ? 'default' : 'outline'}
                    onClick={() => patchSelectedDays(day)}
                  >
                    {WEEK_DAY_LABELS[day]}
                  </Button>
                ))}
              </div>
              <Button className="mt-3" size="sm" onClick={saveSchedule} disabled={busy}>
                Save schedule
              </Button>
            </div>

            <form onSubmit={assignOne} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <Label htmlFor="pupil-id">Assign pupil (student id)</Label>
                <Input
                  id="pupil-id"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Paste student UUID"
                />
              </div>
              <Button type="submit" disabled={busy || !studentId.trim()}>
                Assign pupil
              </Button>
            </form>

            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="bulk-scope">Assign all pupils</Label>
                <select
                  id="bulk-scope"
                  className="zsms-select mt-1 block w-full min-w-[180px]"
                  value={assignScope}
                  onChange={(e) => setAssignScope(e.target.value)}
                >
                  <option value="all">Entire school</option>
                  <option value="class">Selected class (via API classId)</option>
                </select>
              </div>
              <Button type="button" variant="outline" onClick={assignBulk} disabled={busy}>
                Assign all in scope
              </Button>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                Participants ({selected.participants?.length || 0})
              </p>
              <ul className="max-h-48 overflow-y-auto divide-y divide-royalPurple-border rounded-lg border border-royalPurple-border">
                {(selected.participants || []).slice(0, 100).map((p) => (
                  <li key={p.id} className="px-3 py-2 text-sm">
                    {p.student?.name || p.user?.name || p.studentId || 'Pupil'}
                    {p.student?.class ? (
                      <span className="text-royalPurple-text3"> · {p.student.class}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default function HouseActivitiesPage() {
  return (
    <DashboardLayout title="Inter-house activities">
      <PrimaryOnlyRouteGuard redirectTo="/dashboard/headteacher">
        <FeatureGate featureId="inter-house">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-royalPurple-text1 mb-2">
              Inter-house extracurricular
            </h1>
            <p className="text-sm text-royalPurple-text3 mb-6">
              Sports, preventive maintenance, clubs, and production unit — with weekly calendars and
              pupil assignment (primary schools).
            </p>
            <HouseActivitiesInner />
          </div>
        </FeatureGate>
      </PrimaryOnlyRouteGuard>
    </DashboardLayout>
  )
}
