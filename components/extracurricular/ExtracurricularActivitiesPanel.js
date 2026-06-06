'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react'
import { ACTIVITY_TYPES } from '@/lib/activities/helpers'

function StudentSearchPicker({ onSelect, excludeIds = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return undefined
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/students?q=${encodeURIComponent(query.trim())}&limit=8`, {
          credentials: 'include',
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Search failed')
        const excluded = new Set(excludeIds)
        setResults((json.data || []).filter((s) => !excluded.has(s.id)))
      } catch (e) {
        toast.error(e.message || 'Could not search students')
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, excludeIds])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-royalPurple-text3" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search learners by name, class, or exam number"
          className="pl-9"
        />
      </div>
      {searching ? <p className="text-xs text-royalPurple-text3">Searching…</p> : null}
      {results.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-royalPurple-border divide-y divide-royalPurple-border">
          {results.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-royalPurple-card2"
                onClick={() => {
                  onSelect(student)
                  setQuery('')
                  setResults([])
                }}
              >
                <span>
                  <span className="font-medium text-royalPurple-text1">{student.name}</span>
                  <span className="block text-xs text-royalPurple-text3">
                    {student.class}
                    {student.exam_number ? ` · ${student.exam_number}` : ''}
                  </span>
                </span>
                <Plus className="size-4 text-royalPurple-accent" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ExtracurricularActivitiesPanel() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'club',
    location: '',
    date: '',
  })

  const selected = activities.find((a) => a.id === selectedId) || null

  const loadActivities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activities?includeInactive=true', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load activities')
      setActivities(json.data || [])
      if (!selectedId && json.data?.[0]?.id) setSelectedId(json.data[0].id)
    } catch (e) {
      toast.error(e.message || 'Could not load activities')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const createActivity = async (e) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) {
      toast.error('Enter an activity name')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description: form.description,
          type: form.type,
          location: form.location || undefined,
          date: form.date || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create activity')
      toast.success('Activity created')
      setForm({ title: '', description: '', type: 'club', location: '', date: '' })
      setCreating(false)
      setSelectedId(json.data.id)
      await loadActivities()
    } catch (e) {
      toast.error(e.message || 'Could not create activity')
    } finally {
      setSaving(false)
    }
  }

  const addParticipant = async (student) => {
    if (!selected) return
    try {
      const res = await fetch(`/api/activities/${selected.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId: student.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to register learner')
      toast.success(`${student.name} added`)
      setActivities((prev) => prev.map((a) => (a.id === selected.id ? json.data : a)))
    } catch (e) {
      toast.error(e.message || 'Could not register learner')
    }
  }

  const removeParticipant = async (studentId) => {
    if (!selected) return
    try {
      const res = await fetch(
        `/api/activities/${selected.id}/participants?studentId=${encodeURIComponent(studentId)}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove learner')
      toast.success('Learner removed')
      setActivities((prev) => prev.map((a) => (a.id === selected.id ? json.data : a)))
    } catch (e) {
      toast.error(e.message || 'Could not remove learner')
    }
  }

  const participantIds = (selected?.participants || []).map((p) => p.studentId).filter(Boolean)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Activities</CardTitle>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadActivities}
              aria-label="Refresh"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button type="button" size="sm" onClick={() => setCreating((v) => !v)}>
              <Plus className="mr-1 size-4" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <p className="text-sm text-royalPurple-text3">Loading…</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-royalPurple-text3">No activities yet.</p>
          ) : (
            activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedId(activity.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === activity.id
                    ? 'border-royalPurple-accent bg-royalPurple-accentBg'
                    : 'border-royalPurple-border hover:bg-royalPurple-card2'
                } ${!activity.isActive ? 'opacity-60' : ''}`}
              >
                <span className="font-medium text-royalPurple-text1">{activity.title}</span>
                <span className="block text-xs text-royalPurple-text3">
                  {activity.type} · {activity.participantCount} learner
                  {activity.participantCount === 1 ? '' : 's'}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {creating ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New extracurricular activity</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createActivity} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="activity-title">Activity name</Label>
                  <Input
                    id="activity-title"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Chess Club, Football Team"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ACTIVITY_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="activity-date">Event date (optional)</Label>
                    <Input
                      id="activity-date"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="activity-location">Location (optional)</Label>
                  <Input
                    id="activity-location"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="activity-description">Description (optional)</Label>
                  <Input
                    id="activity-description"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Create activity'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-5" />
                {selected.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <p className="text-sm text-royalPurple-text2">
                Search the school learner database and add participants. Learners can belong to
                multiple activities.
              </p>

              <StudentSearchPicker excludeIds={participantIds} onSelect={addParticipant} />

              <div>
                <h4 className="mb-2 text-sm font-semibold text-royalPurple-text1">
                  Registered learners ({selected.participants?.length || 0})
                </h4>
                {(selected.participants || []).length === 0 ? (
                  <p className="text-sm text-royalPurple-text3">No learners registered yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {selected.participants.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-royalPurple-border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-royalPurple-text1">
                            {p.student?.name || p.user?.name || 'Learner'}
                          </p>
                          <p className="text-xs text-royalPurple-text3">
                            {p.student?.class || '—'}
                            {p.student?.exam_number ? ` · ${p.student.exam_number}` : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParticipant(p.studentId)}
                          aria-label="Remove learner"
                        >
                          <X className="size-4 text-red-600" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          !creating && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-royalPurple-text3">
                Select an activity or create a new one to register learners.
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
