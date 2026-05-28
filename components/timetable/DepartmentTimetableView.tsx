'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Assignment, Class, Classroom, Teacher, TimeSlot } from '@/lib/timetable/types'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import { resolveCardColor } from '@/lib/timetable/cardColors'
import { teacherDisplayName } from '@/lib/timetable/teacherDisplay'
import { uniqueBellRows, type BellScheduleSlot } from '@/lib/timetable/bellSchedule'
import {
  assignmentOverlapsSlot,
  isPrimarySlotForAssignment,
  isTeacherContinuationSlot,
  rowSpanForAssignment,
} from '@/lib/timetable/gridHelpers'
import { useAuth } from '@/lib/auth'
import { printTimetable } from '@/lib/timetable/printTimetable'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export interface DepartmentTimetableViewProps {
  assignments?: Assignment[]
  timeSlots?: TimeSlot[]
  departmentTeacherIds?: string[]
  departmentId?: string
  teachers?: Teacher[]
  classes?: Class[]
  hodId?: string
  classrooms?: Classroom[]
  mobile?: boolean
}

function dayOrder(day: string) {
  const map: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }
  return map[String(day).toLowerCase()] || 99
}

function slotKey(slot: Pick<BellScheduleSlot, 'period' | 'startTime' | 'endTime' | 'isBreak'>) {
  return `${slot.period}|${slot.startTime}|${slot.endTime}|${slot.isBreak ? 1 : 0}`
}

function toMinutes(t: string) {
  const [h, m] = String(t).split(':')
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
  return hh * 60 + mm
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? '')
          const escaped = s.replaceAll('"', '""')
          return `"${escaped}"`
        })
        .join(',')
    )
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function DepartmentTimetableView(props: DepartmentTimetableViewProps) {
  const auth = useAuth()
  const storeAssignments = useTimetableStore((s) => s.assignments)
  const storeConflicts = useTimetableStore((s) => s.conflicts)
  const updateAssignment = useTimetableStore((s) => s.updateAssignment)
  const assignments = props.assignments ?? storeAssignments
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null)
  const [nextTeacherId, setNextTeacherId] = useState<string>('')

  const days = useMemo(() => {
    const set = new Set<string>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    for (const s of props.timeSlots || []) set.add(String(s.dayOfWeek))
    const list = Array.from(set)
    return list.sort((a, b) => dayOrder(a) - dayOrder(b))
  }, [props.timeSlots])

  const storeTimeSlots = useTimetableStore((s) => s.timeSlots)
  const teacherColors = useTimetableStore((s) => s.teacherColors)

  const baseSlots = useMemo((): BellScheduleSlot[] => {
    const src = props.timeSlots?.length ? props.timeSlots : storeTimeSlots
    return uniqueBellRows(src as BellScheduleSlot[]).map((s) => ({
      ...s,
      dayOfWeek: 'monday',
    }))
  }, [props.timeSlots, storeTimeSlots])

  const hasTimeSlots = baseSlots.length > 0

  const effectiveDepartmentId =
    props.departmentId ||
    String(
      auth?.user?.hodProfile?.departmentId ||
        auth?.user?.hodProfile?.department_id ||
        auth?.user?.hodProfile?.departmentRef?.id ||
        auth?.user?.departmentId ||
        auth?.user?.department_id ||
        ''
    )

  const effectiveTeachers = useMemo(() => {
    const list = props.teachers || []
    return Array.isArray(list) ? list : []
  }, [props.teachers])

  const teacherSet = useMemo(() => {
    const explicit = Array.isArray(props.departmentTeacherIds)
      ? props.departmentTeacherIds.map(String).filter(Boolean)
      : []
    if (explicit.length) return new Set(explicit)

    const deptId = String(effectiveDepartmentId || '').trim()
    if (!deptId) return new Set<string>()
    const ids: string[] = []
    for (const t of effectiveTeachers as any[]) {
      const tDept = String(
        t?.departmentId || t?.department_id || t?.department || t?.deptId || ''
      ).trim()
      if (tDept && tDept === deptId) ids.push(String(t.id))
    }
    return new Set(ids)
  }, [props.departmentTeacherIds, effectiveDepartmentId, effectiveTeachers])

  const departmentTeachers = useMemo(() => {
    const ids = Array.from(teacherSet)
    if (!ids.length) return []
    const byId = new Map<string, any>()
    for (const t of effectiveTeachers as any[]) byId.set(String(t.id), t)
    const out = ids.map((id) => byId.get(String(id))).filter(Boolean)
    return out.sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')))
  }, [teacherSet, effectiveTeachers])

  const deptAssignments = useMemo(() => {
    return assignments.filter((a) => teacherSet.has(String(a.teacherId)))
  }, [assignments, teacherSet])

  const byTeacherAndSlot = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of deptAssignments) {
      const day = a.dayOfWeek
      for (const slot of baseSlots) {
        if (slot.isBreak) continue
        if (!assignmentOverlapsSlot(a, day, slot) || !isPrimarySlotForAssignment(a, slot)) continue
        const k = `${a.teacherId}|${day}|${slot.period}|${slot.startTime}|${slot.endTime}`
        if (!map.has(k)) map.set(k, [])
        map.get(k)!.push(a)
      }
    }
    return map
  }, [deptAssignments, baseSlots])

  const teacherName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of departmentTeachers as any[])
      map.set(String(t.id), String(t.fullName || 'Teacher'))
    return map
  }, [departmentTeachers])

  const className = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of props.classes || []) map.set(String(c.id), c.name)
    return map
  }, [props.classes])

  const subjectLabel = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assignments) {
      if (a.subjectId) {
        const name = String((a as any).subjectName || '').trim()
        if (name) map.set(String(a.subjectId), name)
      }
    }
    for (const t of departmentTeachers as any[]) {
      for (const s of t?.subjects || []) {
        if (s?.id && s?.name) map.set(String(s.id), String(s.name))
      }
    }
    return map
  }, [assignments, departmentTeachers])

  useEffect(() => {
    if (typeof props.mobile === 'boolean') {
      setIsMobile(props.mobile)
      return
    }
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [props.mobile])

  useEffect(() => {
    if (!departmentTeachers.length) return
    if (!selectedTeacherId || !teacherSet.has(String(selectedTeacherId))) {
      setSelectedTeacherId(String(departmentTeachers[0]?.id || ''))
    }
  }, [departmentTeachers, selectedTeacherId, teacherSet])

  const visibleTeachers = useMemo(() => {
    if (!isMobile) return departmentTeachers
    const current = departmentTeachers.find((t: any) => String(t.id) === String(selectedTeacherId))
    return current ? [current] : departmentTeachers.slice(0, 1)
  }, [departmentTeachers, isMobile, selectedTeacherId])

  const conflictStats = useMemo(() => {
    let total = 0
    let critical = 0
    for (const a of deptAssignments) {
      const list = storeConflicts.get(String(a.id)) || []
      if (!list.length) continue
      total += list.length
      if (list.some((c) => c.severity === 'critical' || c.severity === 'high')) critical += 1
    }
    return { total, criticalAssignments: critical }
  }, [deptAssignments, storeConflicts])

  const workload = useMemo(() => {
    const perTeacherMinutes = new Map<string, number>()
    const perTeacherMaxHours = new Map<string, number>()
    for (const t of departmentTeachers as any[]) {
      perTeacherMinutes.set(String(t.id), 0)
      const maxH = Number(t?.maxHours?.perWeek)
      perTeacherMaxHours.set(String(t.id), Number.isFinite(maxH) && maxH > 0 ? maxH : 25)
    }
    for (const a of deptAssignments) {
      const mins = Math.max(0, toMinutes(a.endTime) - toMinutes(a.startTime))
      perTeacherMinutes.set(
        String(a.teacherId),
        (perTeacherMinutes.get(String(a.teacherId)) || 0) + mins
      )
    }
    const hoursList: number[] = []
    const overloads: Array<{ teacherId: string; hours: number; max: number }> = []
    for (const [tid, mins] of perTeacherMinutes.entries()) {
      const hours = mins / 60
      hoursList.push(hours)
      const max = perTeacherMaxHours.get(tid) || 25
      if (hours > max) overloads.push({ teacherId: tid, hours, max })
    }
    const totalHours = hoursList.reduce((a, b) => a + b, 0)
    const avg = hoursList.length ? totalHours / hoursList.length : 0
    const min = hoursList.length ? Math.min(...hoursList) : 0
    const max = hoursList.length ? Math.max(...hoursList) : 0
    return { perTeacherMinutes, perTeacherMaxHours, totalHours, avg, min, max, overloads }
  }, [deptAssignments, departmentTeachers])

  const optimizationScore = useMemo(() => {
    let score = 100
    score -= Math.min(60, conflictStats.total * 3)
    for (const o of workload.overloads) score -= Math.min(20, (o.hours - o.max) * 4)
    if (departmentTeachers.length === 0) score = 0
    return Math.max(0, Math.min(100, Math.round(score)))
  }, [conflictStats.total, workload.overloads, departmentTeachers.length])

  const commonFreeSlots = useMemo(() => {
    if (!baseSlots.length || !days.length || !departmentTeachers.length) return []
    const slots: Array<{ day: string; slot: BellScheduleSlot }> = []
    for (const day of days) {
      for (const slot of baseSlots) {
        if (slot.isBreak) continue
        let allFree = true
        for (const t of departmentTeachers as any[]) {
          const k = `${t.id}|${day}|${slot.period}|${slot.startTime}|${slot.endTime}`
          const list = byTeacherAndSlot.get(k) || []
          if (list.length) {
            allFree = false
            break
          }
        }
        if (allFree) slots.push({ day, slot })
      }
    }
    return slots.slice(0, 3)
  }, [baseSlots, days, departmentTeachers, byTeacherAndSlot])

  const rebalanceSuggestions = useMemo(() => {
    const out: Array<{
      id: string
      fromTeacherId: string
      toTeacherId: string
      assignmentId: string
      label: string
      impact: string
    }> = []
    const overloaded = workload.overloads.slice().sort((a, b) => b.hours - a.hours)
    if (!overloaded.length) return out

    const teachersById = new Map<string, any>()
    for (const t of departmentTeachers as any[]) teachersById.set(String(t.id), t)

    const assignmentsByTeacher = new Map<string, Assignment[]>()
    for (const a of deptAssignments) {
      const key = String(a.teacherId)
      if (!assignmentsByTeacher.has(key)) assignmentsByTeacher.set(key, [])
      assignmentsByTeacher.get(key)!.push(a)
    }

    const getTeacherHours = (tid: string) => (workload.perTeacherMinutes.get(String(tid)) || 0) / 60
    const getTeacherMax = (tid: string) => workload.perTeacherMaxHours.get(String(tid)) || 25

    for (const o of overloaded) {
      const fromId = String(o.teacherId)
      const list = (assignmentsByTeacher.get(fromId) || [])
        .slice()
        .sort((a, b) => a.period - b.period)
      for (const a of list) {
        const candidates = (departmentTeachers as any[])
          .filter((t) => String(t.id) !== fromId)
          .filter((t) => {
            const qualified = Array.isArray(t?.subjects)
              ? t.subjects.some((s: any) => String(s?.id) === String(a.subjectId))
              : false
            return qualified
          })
          .filter((t) => getTeacherHours(String(t.id)) < getTeacherMax(String(t.id)))
          .filter((t) => {
            const k = `${t.id}|${a.dayOfWeek}|${a.period}|${a.startTime}|${a.endTime}`
            return (byTeacherAndSlot.get(k) || []).length === 0
          })

        if (!candidates.length) continue
        const to = candidates.sort(
          (x, y) => getTeacherHours(String(x.id)) - getTeacherHours(String(y.id))
        )[0]
        const fromHours = getTeacherHours(fromId)
        const toHours = getTeacherHours(String(to.id))
        const moveHrs = Math.max(0, (toMinutes(a.endTime) - toMinutes(a.startTime)) / 60)
        const newFrom = Math.max(0, fromHours - moveHrs)
        const newTo = toHours + moveHrs
        out.push({
          id: `move:${a.id}:${fromId}:${to.id}`,
          fromTeacherId: fromId,
          toTeacherId: String(to.id),
          assignmentId: String(a.id),
          label: `Move ${String(className.get(String(a.classId)) || a.classId)} ${String(a.subjectId)} from ${
            teacherName.get(fromId) || 'Teacher'
          } to ${teacherName.get(String(to.id)) || 'Teacher'}`,
          impact: `Rebalances to ${newFrom.toFixed(1)}h and ${newTo.toFixed(1)}h`,
        })
        if (out.length >= 5) return out
      }
    }
    return out
  }, [
    workload.overloads,
    workload.perTeacherMinutes,
    workload.perTeacherMaxHours,
    deptAssignments,
    departmentTeachers,
    byTeacherAndSlot,
    className,
    teacherName,
  ])

  const subjectCoverage = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const a of deptAssignments) {
      const sid = String(a.subjectId)
      if (!map.has(sid)) map.set(sid, new Set())
      map.get(sid)!.add(String(a.teacherId))
    }
    const rows = Array.from(map.entries())
      .map(([subjectId, set]) => ({ subjectId, teacherIds: Array.from(set) }))
      .sort((a, b) => b.teacherIds.length - a.teacherIds.length)
    return rows.slice(0, 8)
  }, [deptAssignments])

  const activeAssignment = useMemo(() => {
    if (!activeAssignmentId) return null
    return assignments.find((a) => String(a.id) === String(activeAssignmentId)) || null
  }, [activeAssignmentId, assignments])

  const candidatesForActive = useMemo(() => {
    if (!activeAssignment) return []
    const sid = String(activeAssignment.subjectId)
    return (departmentTeachers as any[])
      .filter(
        (t) => Array.isArray(t?.subjects) && t.subjects.some((s: any) => String(s?.id) === sid)
      )
      .sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')))
  }, [activeAssignment, departmentTeachers])

  useEffect(() => {
    if (!open) {
      setActiveAssignmentId(null)
      setNextTeacherId('')
    }
  }, [open])

  return (
    <div className="space-y-4">
      <div className="onboard-card p-5 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-royalPurple-text1 font-bold text-lg">Department Timetable</div>
            <div className="text-royalPurple-text2 text-sm mt-1">
              Total periods: {deptAssignments.length} · Average workload: {workload.avg.toFixed(1)}h
              · Range: {workload.min.toFixed(1)}–{workload.max.toFixed(1)}h · Conflicts:{' '}
              {conflictStats.total} · Overloaded: {workload.overloads.length} · Score:{' '}
              {optimizationScore}/100
            </div>
            {commonFreeSlots.length ? (
              <div className="text-xs text-royalPurple-text3 mt-2">
                Recommended meeting time:{' '}
                {commonFreeSlots
                  .map(
                    (x) =>
                      `${x.day.slice(0, 3).toUpperCase()} ${x.slot.startTime}-${x.slot.endTime}`
                  )
                  .join(' · ')}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => printTimetable()} className="zsms-hover-raise">
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const rows: string[][] = [
                  ['Day', 'Start', 'End', 'Teacher', 'Subject', 'Class'],
                  ...deptAssignments
                    .slice()
                    .sort(
                      (a, b) =>
                        String(a.dayOfWeek).localeCompare(String(b.dayOfWeek)) ||
                        a.period - b.period
                    )
                    .map((a) => [
                      String(a.dayOfWeek),
                      String(a.startTime),
                      String(a.endTime),
                      teacherName.get(String(a.teacherId)) || String(a.teacherId),
                      String(a.subjectId),
                      className.get(String(a.classId)) || String(a.classId),
                    ]),
                ]
                downloadCsv('department_timetable.csv', rows)
              }}
              className="zsms-hover-raise"
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {workload.overloads.length ? (
        <div className="rounded-2xl border border-royalPurple-border/40 bg-royalPurple-card/60 p-4 print:hidden">
          <div className="text-sm font-bold text-royalPurple-dangerTx">Overloaded teachers</div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {workload.overloads.slice(0, 6).map((o) => (
              <div
                key={o.teacherId}
                className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-danger/10 px-3 py-2"
              >
                <div className="text-sm font-semibold text-royalPurple-text1">
                  {teacherName.get(o.teacherId) || 'Teacher'}
                </div>
                <div className="text-xs text-royalPurple-dangerTx">
                  Overloaded: {o.hours.toFixed(1)}/{o.max} hours
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {rebalanceSuggestions.length ? (
        <div className="rounded-2xl border border-royalPurple-border/40 bg-royalPurple-card/60 p-4 print:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-royalPurple-text1">Suggested rebalancing</div>
              <div className="text-xs text-royalPurple-text3 mt-1">
                Moves only within the department and only to qualified teachers with a free slot.
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {rebalanceSuggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-deep/40 px-3 py-2 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-royalPurple-text1 truncate">
                    {s.label}
                  </div>
                  <div className="text-xs text-royalPurple-text3">{s.impact}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateAssignment(s.assignmentId as any, { teacherId: s.toTeacherId } as any)
                    }
                    className="zsms-hover-raise"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {subjectCoverage.length ? (
        <div className="rounded-2xl border border-royalPurple-border/40 bg-royalPurple-card/60 p-4 print:hidden">
          <div className="text-sm font-bold text-royalPurple-text1">Subject coverage</div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {subjectCoverage.map((row) => (
              <div
                key={row.subjectId}
                className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-deep/40 px-3 py-2"
              >
                <div className="text-sm font-semibold text-royalPurple-text1">
                  {subjectLabel.get(row.subjectId) || row.subjectId}
                </div>
                <div className="text-xs text-royalPurple-text3">
                  Coverage:{' '}
                  {row.teacherIds.map((id) => teacherName.get(String(id)) || 'Teacher').join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isMobile ? (
        <div className="flex flex-wrap gap-2 print:hidden">
          {(departmentTeachers as any[]).slice(0, 12).map((t) => {
            const tid = String(t.id)
            const hours = (workload.perTeacherMinutes.get(tid) || 0) / 60
            const max = workload.perTeacherMaxHours.get(tid) || 25
            const overloaded = hours > max
            return (
              <button
                key={tid}
                type="button"
                onClick={() => setSelectedTeacherId(tid)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectedTeacherId === tid
                    ? 'bg-royalPurple-accent text-white border-royalPurple-accent'
                    : overloaded
                      ? 'bg-royalPurple-danger/10 text-royalPurple-dangerTx border-royalPurple-danger/30'
                      : 'bg-royalPurple-card/40 text-royalPurple-text2 border-royalPurple-border/40'
                }`}
              >
                {String(t.fullName || 'Teacher').split(' ')[0]} · {hours.toFixed(0)}/{max}h
              </button>
            )
          })}
        </div>
      ) : null}

      {!hasTimeSlots && (
        <div className="onboard-card p-5">
          <div className="text-royalPurple-text1 font-bold text-lg">No time slots</div>
          <div className="text-royalPurple-text2 text-sm mt-1">
            Configure school hours in Timetable Settings, or wait for the bell schedule to load.
          </div>
        </div>
      )}

      {hasTimeSlots ? (
        <div className="timetable-container border border-royalPurple-border/40 rounded-2xl overflow-auto bg-royalPurple-card/60">
          <div className="min-w-[980px]">
            <div
              className="grid sticky top-0 z-10 bg-royalPurple-deep/95 backdrop-blur border-b border-royalPurple-border/40"
              style={{
                gridTemplateColumns: `220px repeat(${visibleTeachers.length}, minmax(260px, 1fr))`,
              }}
            >
              <div className="px-4 py-3 text-xs font-semibold text-royalPurple-text3 uppercase">
                Time
              </div>
              {visibleTeachers.map((t: any) => {
                const tid = String(t.id)
                const mins = workload.perTeacherMinutes.get(tid) || 0
                const hours = mins / 60
                const max = workload.perTeacherMaxHours.get(tid) || 25
                const overloaded = hours > max
                return (
                  <div key={tid} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-royalPurple-text2 uppercase truncate">
                        {String(t.fullName || 'Teacher')}
                      </div>
                      <div
                        className={`text-xs font-bold ${overloaded ? 'text-royalPurple-dangerTx' : 'text-royalPurple-text3'}`}
                      >
                        {hours.toFixed(0)}/{max}h
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {days.map((day) => (
              <div key={day} className="border-t border-royalPurple-border/40">
                <div className="px-4 py-2 text-xs font-bold text-royalPurple-text2 uppercase bg-royalPurple-deep/40 sticky left-0">
                  {day}
                </div>
                {baseSlots.map((slot) => (
                  <div
                    key={`${day}|${slotKey(slot)}`}
                    className={`grid border-b border-royalPurple-border/20 ${slot.isBreak ? 'bg-slate-100/70' : ''}`}
                    style={{
                      gridTemplateColumns: `220px repeat(${visibleTeachers.length}, minmax(260px, 1fr))`,
                    }}
                  >
                    <div className="px-4 py-3">
                      <div className="font-semibold text-royalPurple-text1 text-sm">
                        {slot.label || (slot.isBreak ? 'BREAK' : `Period ${slot.period}`)}
                      </div>
                      <div className="text-xs text-royalPurple-text3">
                        {slot.startTime}–{slot.endTime}
                      </div>
                    </div>
                    {visibleTeachers.map((t: any) => {
                      const tid = String(t.id)
                      const cellK = `${tid}|${day}|${slot.period}|${slot.startTime}|${slot.endTime}`
                      const continued = isTeacherContinuationSlot(
                        day,
                        slot,
                        tid,
                        deptAssignments,
                        baseSlots
                      )
                      if (continued) {
                        return (
                          <div
                            key={cellK}
                            className="px-3 py-3 border-l border-royalPurple-border/20"
                            aria-hidden
                          />
                        )
                      }
                      const list = byTeacherAndSlot.get(cellK) || []
                      const isFree = !slot.isBreak && list.length === 0
                      const border = list.some(
                        (a) => (storeConflicts.get(String(a.id)) || []).length > 0
                      )
                        ? 'border-red-500'
                        : ''

                      return (
                        <div
                          key={cellK}
                          className={`px-3 py-3 border-l border-royalPurple-border/20 ${
                            slot.isBreak
                              ? 'flex items-center justify-center text-xs font-bold text-slate-500'
                              : isFree
                                ? 'bg-blue-500/10'
                                : ''
                          }`}
                        >
                          {slot.isBreak ? (
                            <div className="text-center">BREAK</div>
                          ) : list.length ? (
                            <div className="space-y-2">
                              {list.map((a) => {
                                const conflicts = storeConflicts.get(String(a.id)) || []
                                const hasConflict = conflicts.length > 0
                                const cardColors = resolveCardColor(
                                  a.subjectId,
                                  a.teacherId,
                                  teacherColors[String(a.teacherId || '')]?.colorHex
                                )
                                const span = rowSpanForAssignment(a, baseSlots)
                                const rowH = 88
                                return (
                                  <button
                                    type="button"
                                    key={String(a.id)}
                                    onClick={() => {
                                      setActiveAssignmentId(String(a.id))
                                      setNextTeacherId(String(a.teacherId))
                                      setOpen(true)
                                    }}
                                    className={`w-full text-left rounded-xl border px-3 py-2 hover:opacity-95 transition-colors relative z-[1] ${hasConflict ? 'border-red-500' : 'border-royalPurple-border/40'}`}
                                    style={{
                                      background: cardColors.bg,
                                      borderColor: hasConflict ? undefined : cardColors.border,
                                      minHeight: span > 1 ? `${span * rowH - 12}px` : undefined,
                                      marginBottom:
                                        span > 1 ? `-${(span - 1) * rowH}px` : undefined,
                                    }}
                                  >
                                    <div className="font-bold text-[13px] text-slate-900 truncate">
                                      {subjectLabel.get(String(a.subjectId)) ||
                                        (a as any).subjectName ||
                                        'Subject'}
                                    </div>
                                    <div className="text-[12px] text-slate-700 truncate">
                                      {(a as any).className ||
                                        className.get(String(a.classId)) ||
                                        String(a.classId)}
                                    </div>
                                    <div
                                      className="text-[12px] font-bold text-slate-600 truncate"
                                      title={teacherName.get(String(a.teacherId)) || 'Teacher'}
                                    >
                                      {teacherDisplayName(
                                        teacherName.get(String(a.teacherId)),
                                        'initials'
                                      )}
                                      {hasConflict ? ' · Conflict' : ''}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-blue-500 text-center">FREE</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit / Reassign">
        <div className="space-y-4">
          {activeAssignment ? (
            <div className="rounded-xl border border-royalPurple-border bg-royalPurple-card/40 p-4">
              <div className="text-sm font-bold text-royalPurple-text1">
                {String(activeAssignment.subjectId)}
              </div>
              <div className="text-sm text-royalPurple-text2 mt-1">
                {String(activeAssignment.dayOfWeek)} {String(activeAssignment.startTime)}-
                {String(activeAssignment.endTime)}
              </div>
              <div className="text-sm text-royalPurple-text2">
                {className.get(String(activeAssignment.classId)) ||
                  String(activeAssignment.classId)}
              </div>
            </div>
          ) : (
            <div className="text-sm text-royalPurple-text2">No assignment selected.</div>
          )}

          {activeAssignment ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-royalPurple-text1">Reassign to</div>
              <select
                className="zsms-select w-full"
                value={nextTeacherId}
                onChange={(e) => setNextTeacherId(e.target.value)}
              >
                {candidatesForActive.map((t: any) => (
                  <option key={String(t.id)} value={String(t.id)}>
                    {String(t.fullName || 'Teacher')}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!activeAssignment) return
                    const fromTeacherId = String(activeAssignment.teacherId)
                    const toTeacherId = String(nextTeacherId)
                    if (!toTeacherId || toTeacherId === fromTeacherId) {
                      setOpen(false)
                      return
                    }

                    const swapKey = `${toTeacherId}|${activeAssignment.dayOfWeek}|${activeAssignment.period}|${activeAssignment.startTime}|${activeAssignment.endTime}`
                    const swapList = byTeacherAndSlot.get(swapKey) || []
                    if (swapList.length) {
                      const other = swapList[0]
                      updateAssignment(
                        String(activeAssignment.id) as any,
                        { teacherId: toTeacherId } as any
                      )
                      updateAssignment(String(other.id) as any, { teacherId: fromTeacherId } as any)
                      setOpen(false)
                      return
                    }

                    updateAssignment(
                      String(activeAssignment.id) as any,
                      { teacherId: toTeacherId } as any
                    )
                    setOpen(false)
                  }}
                  className="zsms-hover-raise"
                >
                  Save
                </Button>
              </div>
              <div className="text-xs text-royalPurple-text3">
                If the selected teacher already has a lesson in this slot, Save performs a swap.
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
