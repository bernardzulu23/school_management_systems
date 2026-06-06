'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { Lightbulb, Plus, RefreshCw, Trash2 } from 'lucide-react'
import {
  LAB_TYPES,
  PROJECT_CATEGORIES,
  INNOVATION_METHODOLOGIES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_OPTIONS,
} from '@/lib/innovation/constants'

const textareaClassName =
  'flex min-h-[88px] w-full bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2'

export function InnovationProjectsPanel() {
  const [projects, setProjects] = useState([])
  const [summary, setSummary] = useState({ total: 0, inProgress: 0, completed: 0, mine: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'STEM_INNOVATION',
    labType: 'INNOVATION_HUB',
    methodology: 'DESIGN_THINKING',
    teamMembers: '',
  })

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/innovation/projects', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load projects')
      setProjects(json.data || [])
      setSummary(json.summary || { total: 0, inProgress: 0, completed: 0, mine: 0 })
    } catch (e) {
      toast.error(e.message || 'Could not load innovation projects')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const createProject = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const teamMembers = form.teamMembers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const res = await fetch('/api/innovation/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          labType: form.labType,
          methodology: form.methodology,
          teamMembers,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create project')
      toast.success('Innovation project created')
      setForm({
        title: '',
        description: '',
        category: 'STEM_INNOVATION',
        labType: 'INNOVATION_HUB',
        methodology: 'DESIGN_THINKING',
        teamMembers: '',
      })
      setShowForm(false)
      loadProjects()
    } catch (e) {
      toast.error(e.message || 'Could not create project')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/innovation/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      loadProjects()
    } catch (e) {
      toast.error(e.message || 'Could not update project')
    }
  }

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this innovation project?')) return
    try {
      const res = await fetch(`/api/innovation/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Delete failed')
      toast.success('Project deleted')
      loadProjects()
    } catch (e) {
      toast.error(e.message || 'Could not delete project')
    }
  }

  return (
    <Card className="white-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-royalPurple-accentTx" />
            Innovation lab projects
          </CardTitle>
          <p className="text-sm text-royalPurple-text3 mt-1">
            Register STEM, entrepreneurship, and social-impact projects for your school.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={loadProjects} aria-label="Refresh projects">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            {showForm ? 'Cancel' : 'New project'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-center">
            <p className="text-2xl font-bold text-royalPurple-text1">{summary.total}</p>
            <p className="text-xs text-royalPurple-text3">School projects</p>
          </div>
          <div className="rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-center">
            <p className="text-2xl font-bold text-royalPurple-text1">{summary.inProgress}</p>
            <p className="text-xs text-royalPurple-text3">In progress</p>
          </div>
          <div className="rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-center">
            <p className="text-2xl font-bold text-royalPurple-text1">{summary.completed}</p>
            <p className="text-xs text-royalPurple-text3">Completed</p>
          </div>
          <div className="rounded-lg border border-royalPurple-border bg-royalPurple-card2 p-3 text-center">
            <p className="text-2xl font-bold text-royalPurple-text1">{summary.mine}</p>
            <p className="text-xs text-royalPurple-text3">Your projects</p>
          </div>
        </div>

        {showForm ? (
          <form
            onSubmit={createProject}
            className="rounded-xl border border-royalPurple-border p-4 space-y-4 bg-royalPurple-card2/50"
          >
            <div>
              <Label>Project title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Solar-powered water pump for Mkushi community"
                required
              />
            </div>
            <div>
              <Label>Description *</Label>
              <textarea
                className={textareaClassName}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Problem, approach, expected impact…"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(PROJECT_CATEGORIES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lab type</Label>
                <Select
                  value={form.labType}
                  onValueChange={(v) => setForm((p) => ({ ...p, labType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(LAB_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Methodology</Label>
                <Select
                  value={form.methodology}
                  onValueChange={(v) => setForm((p) => ({ ...p, methodology: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(INNOVATION_METHODOLOGIES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Team members (comma-separated)</Label>
              <Input
                value={form.teamMembers}
                onChange={(e) => setForm((p) => ({ ...p, teamMembers: e.target.value }))}
                placeholder="Alice Banda, Chanda Mwila"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Create project'}
            </Button>
          </form>
        ) : null}

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : projects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <Lightbulb className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No innovation projects yet</EmptyTitle>
              <EmptyDescription>
                Register your first idea with the New project button above.
              </EmptyDescription>
            </EmptyHeader>
            {!showForm ? (
              <EmptyContent>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 size-4" />
                  New project
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <ul className="divide-y divide-royalPurple-border rounded-xl border border-royalPurple-border overflow-hidden">
            {projects.map((p) => (
              <li
                key={p.id}
                className="p-4 bg-white hover:bg-royalPurple-card2/40 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-royalPurple-text1">{p.title}</p>
                    <p className="text-sm text-royalPurple-text2 mt-1 line-clamp-2">
                      {p.description}
                    </p>
                    <p className="text-xs text-royalPurple-text3 mt-2">
                      {PROJECT_CATEGORIES[p.category]?.name || p.category}
                      {p.labType ? ` · ${LAB_TYPES[p.labType]?.name || p.labType}` : ''}
                      {p.teamMembers?.length ? ` · Team: ${p.teamMembers.join(', ')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {PROJECT_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProject(p.id)}
                      aria-label="Delete project"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-royalPurple-text3 mt-2">
                  Status: {PROJECT_STATUS_LABELS[p.status] || p.status} · Updated{' '}
                  {new Date(p.updatedAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
