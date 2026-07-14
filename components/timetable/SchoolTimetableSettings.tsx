'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Clock, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DEFAULT_TIMETABLE_CONFIG,
  buildTimeSlotsFromConfig,
  countPeriodsPerDay,
  normalizeTimetableConfig,
  suggestNextBreakSlot,
  validateTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type BreakSlot = {
  label: string
  start: string
  end: string
  isLunch?: boolean
}

type ConfigForm = {
  startTime: string
  endTime: string
  singleDuration: number
  workingDays: string[]
  breakSlots: BreakSlot[]
  schedulingRules: {
    minGapPeriods: number
    ruleASeverity: 'hard' | 'soft'
    ruleBSeverity: 'hard' | 'soft'
    maxPeriodsPerDay: number
    maxConsecutivePeriods: number
    dayOverloadSeverity: 'hard' | 'soft'
    consecutiveSeverity: 'hard' | 'soft'
    breakOverlapSeverity: 'hard' | 'soft'
  }
}

function emptyForm(): ConfigForm {
  const d = normalizeTimetableConfig(DEFAULT_TIMETABLE_CONFIG)
  return {
    startTime: d.startTime,
    endTime: d.endTime,
    singleDuration: d.singleDuration,
    workingDays: [...d.workingDays],
    breakSlots: d.breakSlots.map((b) => ({ ...b })),
    schedulingRules: { ...d.schedulingRules },
  }
}

export function SchoolTimetableSettings({
  onSaved,
}: {
  /** Called after save with normalized config + built time slots */
  onSaved?: (payload: {
    config: ConfigForm
    timeSlots: ReturnType<typeof buildTimeSlotsFromConfig>
  }) => void
}) {
  const [form, setForm] = useState<ConfigForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/timetable/config', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load settings')
      const d = normalizeTimetableConfig(data.config)
      setForm({
        startTime: d.startTime,
        endTime: d.endTime,
        singleDuration: d.singleDuration,
        workingDays: [...d.workingDays],
        breakSlots: d.breakSlots.map((b) => ({ ...b })),
        schedulingRules: { ...d.schedulingRules },
      })
    } catch (e: any) {
      toast.error(e?.message || 'Could not load timetable settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const previewSlots = useMemo(() => buildTimeSlotsFromConfig(form), [form])
  const periodsPerDay = useMemo(() => countPeriodsPerDay(form), [form])
  const mondayPreview = useMemo(
    () => previewSlots.filter((s) => s.dayOfWeek === 'monday'),
    [previewSlots]
  )

  function toggleDay(day: string) {
    setForm((f) => {
      const has = f.workingDays.includes(day)
      return {
        ...f,
        workingDays: has ? f.workingDays.filter((d) => d !== day) : [...f.workingDays, day],
      }
    })
  }

  function addBreak() {
    setForm((f) => ({
      ...f,
      breakSlots: [...f.breakSlots, suggestNextBreakSlot(f)],
    }))
  }

  function updateBreak(index: number, patch: Partial<BreakSlot>) {
    setForm((f) => {
      const next = [...f.breakSlots]
      next[index] = { ...next[index], ...patch }
      return { ...f, breakSlots: next }
    })
  }

  function removeBreak(index: number) {
    setForm((f) => ({
      ...f,
      breakSlots: f.breakSlots.filter((_, i) => i !== index),
    }))
  }

  async function save() {
    const { valid, errors } = validateTimetableConfig(form)
    if (!valid) {
      toast.error(errors[0] || 'Invalid configuration')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/timetable/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.errors?.[0] || 'Save failed')

      const normalized = normalizeTimetableConfig(data.config)
      const slots = Array.isArray(data.timeSlots)
        ? data.timeSlots
        : buildTimeSlotsFromConfig(normalized)
      setForm({
        startTime: normalized.startTime,
        endTime: normalized.endTime,
        singleDuration: normalized.singleDuration,
        workingDays: [...normalized.workingDays],
        breakSlots: normalized.breakSlots.map((b) => ({ ...b })),
        schedulingRules: { ...normalized.schedulingRules },
      })
      toast.success('School day times saved. Regenerate the timetable to apply new slots.')
      onSaved?.({ config: normalized as ConfigForm, timeSlots: slots })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="onboard-card p-5 text-sm text-royalPurple-text2">Loading school hours…</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="onboard-card p-5">
        <div className="flex items-start gap-3">
          <Clock className="text-royalPurple-accent shrink-0 mt-0.5" size={22} />
          <div>
            <h2 className="text-lg font-bold text-royalPurple-text1">School day schedule</h2>
            <p className="text-sm text-royalPurple-text2 mt-1">
              Set when your school starts and ends, how long each period is, working days, and
              breaks. Every timetable view and generation uses these times for your school only.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="onboard-card p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                School starts
              </span>
              <input
                type="time"
                className="zsms-input w-full mt-1"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                School ends
              </span>
              <input
                type="time"
                className="zsms-input w-full mt-1"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
              Period length (minutes)
            </span>
            <select
              className="zsms-select w-full mt-1"
              value={String(form.singleDuration)}
              onChange={(e) =>
                setForm((f) => ({ ...f, singleDuration: Number(e.target.value) || 40 }))
              }
            >
              {[30, 35, 40, 45, 50, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-royalPurple-border/40 p-4 space-y-3 bg-royalPurple-card/20">
            <div>
              <h3 className="text-sm font-bold text-royalPurple-text1">Teacher return rules</h3>
              <p className="text-xs text-royalPurple-text2 mt-1">
                Same subject twice in a day for one class must be one continuous block. Returning
                later with a different subject needs a minimum free-period gap (default 1).
              </p>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                Minimum gap between different subjects (periods)
              </span>
              <input
                type="number"
                min={0}
                max={8}
                className="zsms-input w-full mt-1"
                value={form.schedulingRules.minGapPeriods}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    schedulingRules: {
                      ...f.schedulingRules,
                      minGapPeriods: Math.max(0, Math.min(8, Number(e.target.value) || 0)),
                    },
                  }))
                }
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                  Split same subject (Rule A)
                </span>
                <select
                  className="zsms-select w-full mt-1"
                  value={form.schedulingRules.ruleASeverity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      schedulingRules: {
                        ...f.schedulingRules,
                        ruleASeverity: e.target.value === 'soft' ? 'soft' : 'hard',
                      },
                    }))
                  }
                >
                  <option value="hard">Error (blocks publish)</option>
                  <option value="soft">Warning (can dismiss)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                  Return too soon (Rule B)
                </span>
                <select
                  className="zsms-select w-full mt-1"
                  value={form.schedulingRules.ruleBSeverity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      schedulingRules: {
                        ...f.schedulingRules,
                        ruleBSeverity: e.target.value === 'hard' ? 'hard' : 'soft',
                      },
                    }))
                  }
                >
                  <option value="soft">Warning (can dismiss)</option>
                  <option value="hard">Error (blocks publish)</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-royalPurple-border/40 p-4 space-y-3 bg-royalPurple-card/20">
            <div>
              <h3 className="text-sm font-bold text-royalPurple-text1">Teacher workload limits</h3>
              <p className="text-xs text-royalPurple-text2 mt-1">
                Cap daily teaching load and consecutive periods. Lessons must not cover designated
                break/lunch windows (configured above). Defaults: 6 periods/day, 4 consecutive.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                  Max periods per day
                </span>
                <input
                  type="number"
                  min={1}
                  max={16}
                  className="zsms-input w-full mt-1"
                  value={form.schedulingRules.maxPeriodsPerDay}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      schedulingRules: {
                        ...f.schedulingRules,
                        maxPeriodsPerDay: Math.max(1, Math.min(16, Number(e.target.value) || 6)),
                      },
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                  Max consecutive periods
                </span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="zsms-input w-full mt-1"
                  value={form.schedulingRules.maxConsecutivePeriods}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      schedulingRules: {
                        ...f.schedulingRules,
                        maxConsecutivePeriods: Math.max(
                          1,
                          Math.min(12, Number(e.target.value) || 4)
                        ),
                      },
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                  Day overload
                </span>
                <select
                  className="zsms-select w-full mt-1"
                  value={form.schedulingRules.dayOverloadSeverity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      schedulingRules: {
                        ...f.schedulingRules,
                        dayOverloadSeverity: e.target.value === 'hard' ? 'hard' : 'soft',
                      },
                    }))
                  }
                >
                  <option value="soft">Warning (can dismiss)</option>
                  <option value="hard">Error (blocks publish)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                  Consecutive overload
                </span>
                <select
                  className="zsms-select w-full mt-1"
                  value={form.schedulingRules.consecutiveSeverity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      schedulingRules: {
                        ...f.schedulingRules,
                        consecutiveSeverity: e.target.value === 'hard' ? 'hard' : 'soft',
                      },
                    }))
                  }
                >
                  <option value="soft">Warning (can dismiss)</option>
                  <option value="hard">Error (blocks publish)</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                  Teaching through break/lunch
                </span>
                <select
                  className="zsms-select w-full mt-1"
                  value={form.schedulingRules.breakOverlapSeverity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      schedulingRules: {
                        ...f.schedulingRules,
                        breakOverlapSeverity: e.target.value === 'soft' ? 'soft' : 'hard',
                      },
                    }))
                  }
                >
                  <option value="hard">Error (blocks publish)</option>
                  <option value="soft">Warning (can dismiss)</option>
                </select>
              </label>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
              Working days
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {ALL_DAYS.map((day) => {
                const on = form.workingDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      on
                        ? 'bg-royalPurple-accent text-white border-royalPurple-accent'
                        : 'bg-royalPurple-card/40 text-royalPurple-text2 border-royalPurple-border/40'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-royalPurple-text3 mt-2">
              Default is Mon–Fri if none selected on first save.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-royalPurple-text3 uppercase">
                Breaks & lunch
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addBreak}>
                <Plus size={14} className="mr-1" /> Add break
              </Button>
            </div>
            <div className="space-y-2">
              {form.breakSlots.length === 0 ? (
                <p className="text-sm text-royalPurple-text3">No breaks configured.</p>
              ) : (
                form.breakSlots.map((b, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-royalPurple-border/40 p-3 bg-royalPurple-card/30"
                  >
                    <input
                      className="zsms-input flex-1 min-w-[100px]"
                      value={b.label}
                      placeholder="Label"
                      onChange={(e) => updateBreak(i, { label: e.target.value })}
                    />
                    <input
                      type="time"
                      className="zsms-input w-[110px]"
                      value={b.start}
                      onChange={(e) => updateBreak(i, { start: e.target.value })}
                    />
                    <span className="text-royalPurple-text3 text-sm">to</span>
                    <input
                      type="time"
                      className="zsms-input w-[110px]"
                      value={b.end}
                      onChange={(e) => updateBreak(i, { end: e.target.value })}
                    />
                    <label className="flex items-center gap-1 text-xs text-royalPurple-text2">
                      <input
                        type="checkbox"
                        checked={Boolean(b.isLunch)}
                        onChange={(e) => updateBreak(i, { isLunch: e.target.checked })}
                      />
                      Lunch
                    </label>
                    <button
                      type="button"
                      onClick={() => removeBreak(i)}
                      className="text-red-500 p-1"
                      aria-label="Remove break"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={save} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? 'Saving…' : 'Save school hours'}
            </Button>
          </div>
        </div>

        <div className="onboard-card p-5">
          <h3 className="text-sm font-bold text-royalPurple-text1 mb-1">Preview (Monday)</h3>
          <p className="text-xs text-royalPurple-text3 mb-4">
            {periodsPerDay} teaching period{periodsPerDay === 1 ? '' : 's'} per day ·{' '}
            {form.workingDays.length} working day{form.workingDays.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-1 max-h-[420px] overflow-y-auto text-sm">
            {mondayPreview.map((s) => (
              <li
                key={s.id}
                className={`flex justify-between rounded-lg px-3 py-2 ${
                  s.isBreak
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-royalPurple-card/40 text-royalPurple-text1'
                }`}
              >
                <span>{s.isBreak ? s.label || 'Break' : s.label || `Period ${s.period}`}</span>
                <span className="text-royalPurple-text3 tabular-nums">
                  {s.startTime}–{s.endTime}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
