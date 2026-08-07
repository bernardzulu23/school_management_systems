'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { ArrowLeft, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { SBA_DEFAULT_STARTS_AT_LEVEL, SBA_ENTRY_START_YEAR } from '@/lib/sba/constants'

const COMPONENT_OPTIONS = [
  'COURSEWORK',
  'PRACTICAL',
  'PROJECT',
  'ORAL',
  'PORTFOLIO',
  'TERM_TEST',
  'OTHER',
]

const emptyComponent = () => ({
  componentType: 'COURSEWORK',
  maxRawMark: '',
  weight: '0',
  sortOrder: 0,
  label: '',
})

export default function HeadteacherSbaPolicyPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [policies, setPolicies] = useState([])
  const [subjects, setSubjects] = useState([])
  const [meta, setMeta] = useState(null)

  const [subjectId, setSubjectId] = useState('')
  const [syllabusVersion, setSyllabusVersion] = useState('OLD_SYLLABUS')
  const [startsAtLevel, setStartsAtLevel] = useState(SBA_DEFAULT_STARTS_AT_LEVEL)
  const [sourceDocument, setSourceDocument] = useState('')
  const [components, setComponents] = useState([emptyComponent()])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/headteacher/sba-policy', {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load policies')
      setPolicies(data.policies || [])
      setSubjects(data.subjects || [])
      setMeta(data.meta || null)
      if (!subjectId && data.subjects?.[0]) setSubjectId(data.subjects[0].id)
      if (data.meta?.defaultStartsAtLevel) {
        setStartsAtLevel(data.meta.defaultStartsAtLevel)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    load()
  }, [load])

  async function savePolicy() {
    if (!subjectId) {
      toast.error('Select a subject')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/headteacher/sba-policy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          syllabusVersion,
          startsAtLevel,
          sourceDocument: sourceDocument || null,
          components: components.map((c, i) => ({
            componentType: c.componentType,
            maxRawMark: c.maxRawMark === '' ? null : Number(c.maxRawMark),
            weight: Number(c.weight) || 0,
            sortOrder: i,
            label: c.label || null,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      if (data.weightsWarn) toast(data.warning || 'Weights do not sum to 1.0', { icon: '⚠️' })
      else toast.success('Policy saved')
      await load()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id) {
    try {
      const res = await fetch(`/api/dashboard/headteacher/sba-policy/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success('Deactivated')
      await load()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }

  async function removePolicy(id) {
    if (!confirm('Delete this SBA policy?')) return
    try {
      const res = await fetch(`/api/dashboard/headteacher/sba-policy/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('Deleted')
      await load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/headteacher">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Secondary SBA Policy</h1>
        </div>

        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-1">
            <p>
              School mark-entry policies for secondary SBA (from academic year{' '}
              {meta?.sbaEntryStartYear || SBA_ENTRY_START_YEAR}). Primary policies are deferred.
            </p>
            <p>
              Start level default: {meta?.defaultStartsAtLevel || SBA_DEFAULT_STARTS_AT_LEVEL} (
              {meta?.startLevelSource || 'source TBD'}).
            </p>
            <p>
              CBC source document: {meta?.cbcSourceDocument || 'PENDING'} — leave CBC max marks
              empty until confirmed.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add / update policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Syllabus version</Label>
                <Select value={syllabusVersion} onValueChange={setSyllabusVersion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OLD_SYLLABUS">Old syllabus</SelectItem>
                    <SelectItem value="CBC">CBC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Starts at level</Label>
                <Input
                  value={startsAtLevel}
                  onChange={(e) => setStartsAtLevel(e.target.value)}
                  placeholder="Form 2"
                />
              </div>
              <div>
                <Label>Source document</Label>
                <Input
                  value={sourceDocument}
                  onChange={(e) => setSourceDocument(e.target.value)}
                  placeholder="e.g. ECZ 2022 SBA guide"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Components</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setComponents((prev) => [...prev, emptyComponent()])}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add component
                </Button>
              </div>
              {components.map((c, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 sm:grid-cols-5 items-end border border-border/40 rounded-md p-3"
                >
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={c.componentType}
                      onValueChange={(v) =>
                        setComponents((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, componentType: v } : row))
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPONENT_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max mark</Label>
                    <Input
                      type="number"
                      min={0}
                      value={c.maxRawMark}
                      onChange={(e) =>
                        setComponents((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, maxRawMark: e.target.value } : row
                          )
                        )
                      }
                      placeholder="leave empty if TBD"
                    />
                  </div>
                  <div>
                    <Label>Weight (0–1)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={c.weight}
                      onChange={(e) =>
                        setComponents((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, weight: e.target.value } : row
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={c.label}
                      onChange={(e) =>
                        setComponents((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, label: e.target.value } : row
                          )
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setComponents((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(() => {
                const sum = components.reduce((s, c) => s + (Number(c.weight) || 0), 0)
                if (components.length && Math.abs(sum - 1) > 0.001) {
                  return (
                    <p className="flex items-center gap-2 text-sm text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      Component weights sum to {sum.toFixed(2)} (expected 1.0) — soft warning only.
                    </p>
                  )
                }
                return null
              })()}
            </div>

            <Button onClick={savePolicy} disabled={saving}>
              {saving ? 'Saving…' : 'Save policy'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Existing secondary policies</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Subject</th>
                    <th className="py-2">Syllabus</th>
                    <th className="py-2">Starts</th>
                    <th className="py-2">Components</th>
                    <th className="py-2">Weights</th>
                    <th className="py-2">Active</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id} className="border-b border-border/40">
                      <td className="py-2">{p.subject?.name}</td>
                      <td className="py-2">{p.syllabusVersion}</td>
                      <td className="py-2">{p.startsAtLevel}</td>
                      <td className="py-2">
                        {(p.components || []).map((c) => c.label || c.componentType).join(', ') ||
                          '—'}
                      </td>
                      <td className="py-2">
                        {p.weightsWarn ? (
                          <span className="text-amber-700">{p.weightsSum?.toFixed(2)} ⚠</span>
                        ) : (
                          (p.weightsSum?.toFixed(2) ?? '—')
                        )}
                      </td>
                      <td className="py-2">{p.isActive ? 'Yes' : 'No'}</td>
                      <td className="py-2 space-x-2">
                        {p.isActive && (
                          <Button size="sm" variant="outline" onClick={() => deactivate(p.id)}>
                            Deactivate
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => removePolicy(p.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !policies.length && (
              <p className="text-sm text-muted-foreground py-4">
                No policies yet. CBC stays empty until a source document exists; you can still
                create OLD_SYLLABUS or CBC shells here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
