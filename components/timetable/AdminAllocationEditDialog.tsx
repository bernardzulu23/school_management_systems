'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { Button } from '@/components/ui/Button'
import { formatPeriodConfigLabel } from '@/lib/timetable/formatPeriodConfig'

const PERIOD_PRESETS = [
  {
    id: 'p6',
    label: '6 periods (3 doubles)',
    cfg: { periods: 6, doubles: 3, triples: 0, singles: 0 },
  },
  {
    id: 'p5',
    label: '5 periods (1 double + 1 triple)',
    cfg: { periods: 5, doubles: 1, triples: 1, singles: 0 },
  },
  {
    id: 'p4',
    label: '4 periods (2 doubles)',
    cfg: { periods: 4, doubles: 2, triples: 0, singles: 0 },
  },
]

type AllocationEditData = {
  id: string
  status?: string
  department?: { id?: string; name?: string }
  teacherId?: string
  teacherUserId?: string
  teacherName?: string
  classes?: string[]
  subject?: string
  periodConfig?: Record<string, unknown> | null
  term?: string
  academicYear?: string
}

type Props = {
  open: boolean
  allocationId: string
  initialData?: AllocationEditData | null
  teachers?: Array<{ id: string; fullName?: string; name?: string }>
  onClose: () => void
  onSaved: () => void | Promise<void>
}

function normalizeClasses(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean)
  const raw = String(value || '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function buildPeriodConfig(form: {
  periodPreset: string
  customSingles: number
  customDoubles: number
  customTriples: number
}) {
  if (form.periodPreset === 'custom') {
    const singles = Number(form.customSingles || 0)
    const doubles = Number(form.customDoubles || 0)
    const triples = Number(form.customTriples || 0)
    const periods = singles + doubles * 2 + triples * 3
    const parts: string[] = []
    if (doubles) parts.push(`${doubles} double${doubles === 1 ? '' : 's'}`)
    if (triples) parts.push(`${triples} triple${triples === 1 ? '' : 's'}`)
    if (singles) parts.push(`${singles} single${singles === 1 ? '' : 's'}`)
    const label =
      parts.length > 0
        ? `${periods} periods per week (${parts.join(', ')})`
        : `${periods} periods per week`
    return { preset: 'custom', singles, doubles, triples, periods, label }
  }
  const preset = PERIOD_PRESETS.find((p) => p.id === form.periodPreset) || PERIOD_PRESETS[0]
  return { preset: preset.id, label: preset.label, ...preset.cfg }
}

export function AdminAllocationEditDialog({
  open,
  allocationId,
  initialData,
  teachers = [],
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<AllocationEditData | null>(null)
  const [teacherId, setTeacherId] = useState('')
  const [classesText, setClassesText] = useState('')
  const [subject, setSubject] = useState('')
  const [periodPreset, setPeriodPreset] = useState('p6')
  const [customSingles, setCustomSingles] = useState(0)
  const [customDoubles, setCustomDoubles] = useState(0)
  const [customTriples, setCustomTriples] = useState(0)

  useEffect(() => {
    if (!open || !allocationId) return

    if (initialData) {
      applyData(initialData)
      return
    }

    let cancelled = false
    setLoading(true)
    sessionFetch(`/api/admin/allocations/${encodeURIComponent(allocationId)}/review`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load allocation')
        if (!cancelled) applyData(json?.data || null)
      })
      .catch((e) => {
        if (!cancelled) toast.error(e?.message || 'Failed to load allocation')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, allocationId, initialData])

  function applyData(row: AllocationEditData | null) {
    if (!row) return
    setData(row)
    setTeacherId(String(row.teacherUserId || row.teacherId || ''))
    setClassesText(normalizeClasses(row.classes).join(', '))
    setSubject(String(row.subject || ''))
    const pc = row.periodConfig
    const preset = pc && typeof pc === 'object' && pc.preset ? String(pc.preset) : 'p6'
    setPeriodPreset(preset === 'custom' ? 'custom' : preset || 'p6')
    setCustomSingles(Number((pc as any)?.singles || 0))
    setCustomDoubles(Number((pc as any)?.doubles || 0))
    setCustomTriples(Number((pc as any)?.triples || 0))
    setLoading(false)
  }

  const previewLabel = useMemo(
    () =>
      formatPeriodConfigLabel(
        buildPeriodConfig({
          periodPreset,
          customSingles,
          customDoubles,
          customTriples,
        }) as any,
        { classes: normalizeClasses(classesText) }
      ),
    [periodPreset, customSingles, customDoubles, customTriples, classesText]
  )

  async function onSave() {
    if (!allocationId || saving) return
    const classes = normalizeClasses(classesText)
    if (!teacherId) return toast.error('Select a teacher')
    if (!subject.trim()) return toast.error('Enter a subject')
    if (classes.length === 0) return toast.error('Enter at least one class')

    const periodConfig = buildPeriodConfig({
      periodPreset,
      customSingles,
      customDoubles,
      customTriples,
    })

    setSaving(true)
    try {
      const res = await sessionFetch(
        `/api/admin/allocations/${encodeURIComponent(allocationId)}/update`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId,
            classes,
            subject: subject.trim(),
            periodConfig,
            term: data?.term,
            academicYear: data?.academicYear,
          }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || 'Save failed')

      const synced = Number(json?.timetableAllocationsSynced || 0)
      toast.success(
        json?.timetableResynced && synced > 0
          ? `Saved — ${synced} timetable row(s) updated`
          : 'Allocation saved'
      )
      await onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl border border-royalPurple-border/40 bg-royalPurple-card p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-royalPurple-text1 font-bold text-lg">Edit allocation</div>
            <div className="text-royalPurple-text3 text-sm mt-1">
              {String(data?.department?.name || 'Department')} ·{' '}
              {String(data?.status || '').toUpperCase() || '—'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-royalPurple-border/40 px-3 py-2 text-royalPurple-text2"
          >
            <XIcon />
          </button>
        </div>

        {loading ? (
          <div className="mt-4 text-royalPurple-text2 text-sm">Loading…</div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs text-royalPurple-text3">Teacher</span>
              <select
                className="zsms-input mt-1 w-full"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Select teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName || t.name || t.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-royalPurple-text3">Classes (comma-separated)</span>
              <input
                className="zsms-input mt-1 w-full"
                value={classesText}
                onChange={(e) => setClassesText(e.target.value)}
                placeholder="Form 1A, Form 2B"
              />
            </label>

            <label className="block">
              <span className="text-xs text-royalPurple-text3">Subject</span>
              <input
                className="zsms-input mt-1 w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <div>
              <div className="text-xs text-royalPurple-text3 mb-2">Period configuration</div>
              <div className="space-y-2">
                {PERIOD_PRESETS.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-royalPurple-border/40 px-3 py-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="adminPeriodPreset"
                      checked={periodPreset === p.id}
                      onChange={() => setPeriodPreset(p.id)}
                    />
                    <span className="text-sm text-royalPurple-text1">{p.label}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 rounded-lg border border-royalPurple-border/40 px-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="adminPeriodPreset"
                    checked={periodPreset === 'custom'}
                    onChange={() => setPeriodPreset('custom')}
                  />
                  <span className="text-sm text-royalPurple-text1">Custom</span>
                </label>
              </div>
              {periodPreset === 'custom' ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <label className="block text-xs">
                    Singles
                    <input
                      type="number"
                      min={0}
                      className="zsms-input mt-1 w-full"
                      value={customSingles}
                      onChange={(e) => setCustomSingles(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="block text-xs">
                    Doubles
                    <input
                      type="number"
                      min={0}
                      className="zsms-input mt-1 w-full"
                      value={customDoubles}
                      onChange={(e) => setCustomDoubles(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="block text-xs">
                    Triples
                    <input
                      type="number"
                      min={0}
                      className="zsms-input mt-1 w-full"
                      value={customTriples}
                      onChange={(e) => setCustomTriples(Number(e.target.value) || 0)}
                    />
                  </label>
                </div>
              ) : null}
              <div className="text-xs text-royalPurple-text3 mt-2">{previewLabel}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
