'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { ConflictDisplay } from '@/components/timetable/ConflictDisplay'
import { DragDropTimetable } from '@/components/timetable/DragDropTimetable'
import { MasterTimetableGrid } from '@/components/timetable/MasterTimetableGrid'
import { AscClassWallGrid } from '@/components/timetable/AscClassWallGrid'
import type { UnplacedLesson } from '@/components/timetable/UnplacedLessonsTray'
import {
  TimetableControlBar,
  type TimetableGridMode,
} from '@/components/timetable/TimetableControlBar'
import { TimetableEntityView } from '@/components/timetable/TimetableEntityView'
import {
  filterAssignmentsForUiSeason,
  uiSeasonToDetectorSeason,
} from '@/lib/timetable/seasonFilter'
import TeacherPeriodAssignmentUI from '@/components/timetable/TeacherPeriodAssignmentUI'
import { AllocationNotificationBell } from '@/components/timetable/AllocationNotificationBell'
import { SchoolTimetableSettings } from '@/components/timetable/SchoolTimetableSettings'
import { TeacherColorAssignment } from '@/components/timetable/TeacherColorAssignment'
import { TimePeriodManager } from '@/components/timetable/TimePeriodManager'
import {
  buildTeacherAvailabilityFromConfig,
  normalizeTimetableConfig,
  resolveSchoolTimeSlots,
} from '@/lib/timetable/timeSlotsFromConfig'
import { formatPeriodConfigLabel } from '@/lib/timetable/formatPeriodConfig'
import { normalizeGradeLabel } from '@/lib/timetable/zambiaTerminology'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import type { Assignment, Class, Teacher, TimeSlot } from '@/lib/timetable/types'
import { Check, X } from 'lucide-react'

type Tab = 'assignment' | 'overview' | 'edit' | 'conflicts' | 'cover' | 'settings' | 'allocations'

function formatPeriodDisplay(value: unknown): string {
  return formatPeriodConfigLabel(value as any) || String(value || '')
}

function parseUnplacedConflict(conflict: any, index: number): UnplacedLesson {
  const msg = String(conflict?.message || '')
  const match = msg.match(/Could not place (\w+) for (.+?) — (.+?) \((.+?)\)/)
  return {
    id: String(conflict?.blockId || conflict?.allocationId || index),
    subjectName: match?.[3] || 'Subject',
    className: match?.[4] || 'Class',
    teacherName: match?.[2],
    blockType: String(conflict?.type || match?.[1] || 'single'),
    message: msg || undefined,
  }
}

function toTeacher(
  t: any,
  subjectsByName: Map<string, { id: string; name: string }>,
  schoolConfig?: ReturnType<typeof normalizeTimetableConfig>
): Teacher {
  const name = String(t?.user?.name || t?.name || t?.fullName || 'Teacher').trim()
  const assigned = Array.isArray(t?.assignedSubjects) ? t.assignedSubjects : []
  const subjectRefs = assigned
    .map((n: any) => subjectsByName.get(String(n).toLowerCase()))
    .filter(Boolean)
    .map((s: any) => ({ id: s.id, name: s.name }))

  return {
    id: String(t?.userId || t?.user?.id || t?.id || name),
    fullName: name,
    subjects: subjectRefs,
    availability: buildTeacherAvailabilityFromConfig(schoolConfig) as Teacher['availability'],
    maxHours: { perWeek: Number(t?.maxHoursPerWeek || 28) },
    preferences: { minimizeGaps: true, maxTravelLegsPerDay: 1 },
    traveling: { enabled: false, schools: [] },
  }
}

function toClass(c: any, fallbackSubjects: Array<{ id: string; name: string }>): Class {
  const name = String(c?.name || c?.className || 'Class').trim()
  const gradeRaw = String(c?.yearGroup || c?.year_group || c?.grade || '').match(/\d+/)?.[0]
  const grade = (Number(gradeRaw) as any) || 8
  const subjects = Array.isArray(c?.subjects)
    ? c.subjects
        .map((s: any) => ({
          id: String(s?.id || '').trim(),
          name: String(s?.name || '').trim(),
        }))
        .filter((s: any) => s.id && s.name)
    : fallbackSubjects
  return {
    id: String(c?.id || name),
    name,
    grade,
    students: Number(c?.studentCount || 40),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
  }
}

export default function HeadteacherTimetablePage() {
  return (
    <Suspense fallback={<div>Loading timetable...</div>}>
      <HeadteacherTimetablePageContent />
    </Suspense>
  )
}

function HeadteacherTimetablePageContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('assignment')
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState(() => String(searchParams.get('term') || 'Term 1'))
  const [academicYear, setAcademicYear] = useState(() =>
    String(searchParams.get('academicYear') || new Date().getFullYear())
  )
  const [dbGenerating, setDbGenerating] = useState(false)
  const [dbPublishing, setDbPublishing] = useState(false)
  const [coverTeacherId, setCoverTeacherId] = useState<string>('')
  const [coverDay, setCoverDay] = useState<string>('monday')
  const [coverPeriod, setCoverPeriod] = useState<number>(1)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [timetableConfig, setTimetableConfig] = useState(() => normalizeTimetableConfig(null))
  const [season, setSeason] = useState<'normal' | 'farming' | 'planting'>('normal')
  const [schoolId, setSchoolId] = useState<string>('')

  const [pendingAllocations, setPendingAllocations] = useState<any[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewData, setReviewData] = useState<any | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [masterEntries, setMasterEntries] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [allocationsLoading, setAllocationsLoading] = useState(false)
  const [gridMode, setGridMode] = useState<TimetableGridMode>('wall')
  const [unplacedLessons, setUnplacedLessons] = useState<UnplacedLesson[]>([])
  const [reloadingTimetable, setReloadingTimetable] = useState(false)

  const assignments = useTimetableStore((s) => s.assignments)
  const conflicts = useTimetableStore((s) => s.conflicts)
  const updateAssignment = useTimetableStore((s) => s.updateAssignment)
  const removeAssignment = useTimetableStore((s) => s.removeAssignment)
  const replaceAssignments = useTimetableStore((s) => s.replaceAssignments)
  const undo = useTimetableStore((s) => s.undo)
  const redo = useTimetableStore((s) => s.redo)
  const undoStack = useTimetableStore((s) => s.undoStack)
  const redoStack = useTimetableStore((s) => s.redoStack)
  const publish = useTimetableStore((s) => s.publish)
  const isPublished = useTimetableStore((s) => s.isPublished)
  const lastPublishedAt = useTimetableStore((s) => s.lastPublishedAt)
  const pendingChanges = useTimetableStore((s) => s.pendingChanges)
  const conflictCount = useTimetableStore((s) => s.getConflictCount)
  const loadFromApi = useTimetableStore((s) => s.loadFromApi)
  const loadBellSchedule = useTimetableStore((s) => s.loadBellSchedule)
  const autoResolveConflicts = useTimetableStore((s) => s.autoResolveConflicts)
  const setStoreTimeSlots = useTimetableStore((s) => s.setTimeSlots)
  const setTeacherColors = useTimetableStore((s) => s.setTeacherColors)

  const loadAllocationNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return
      /* AllocationNotificationBell fetches its own count */
    } catch {}
  }, [])

  const loadPendingAllocations = useCallback(async () => {
    const res = await fetch('/api/admin/allocations/pending', {
      cache: 'no-store',
      credentials: 'include',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok)
      throw new Error(json?.message || json?.error || 'Failed to load pending allocations')
    return Array.isArray(json?.allocations) ? json.allocations : []
  }, [])

  const loadMasterTimetableEntries = useCallback(async () => {
    const res = await fetch('/api/admin/master-timetable', {
      cache: 'no-store',
      credentials: 'include',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok)
      throw new Error(json?.message || json?.error || 'Failed to load master timetable entries')
    return Array.isArray(json?.entries) ? json.entries : []
  }, [])

  const loadDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments', { cache: 'no-store', credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return []
      return Array.isArray(json?.data) ? json.data : []
    } catch {
      return []
    }
  }, [])

  const currentPendingId = pendingAllocations[reviewIndex]?.id
    ? String(pendingAllocations[reviewIndex].id)
    : ''

  const loadReview = useCallback(async (allocationId: string) => {
    if (!allocationId) {
      setReviewData(null)
      return
    }
    setReviewLoading(true)
    try {
      const res = await fetch(`/api/admin/allocations/${encodeURIComponent(allocationId)}/review`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.message || json?.error || 'Failed to load allocation details')
      setReviewData(json?.data || null)
    } finally {
      setReviewLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [teachersRes, classesRes, subjectsRes, schoolRes, configRes] = await Promise.all([
          fetch('/api/teachers?limit=200', { cache: 'no-store' }),
          fetch('/api/classes?limit=200', { cache: 'no-store' }),
          fetch('/api/subjects?limit=500', { cache: 'no-store' }),
          fetch('/api/school/current', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/timetable/config', { cache: 'no-store', credentials: 'include' }),
        ])

        const teachersJson = await teachersRes.json().catch(() => ({}))
        const classesJson = await classesRes.json().catch(() => ({}))
        const subjectsJson = await subjectsRes.json().catch(() => ({}))
        const schoolJson = await schoolRes.json().catch(() => ({}))
        const configJson = await configRes.json().catch(() => ({}))

        if (schoolJson?.school?.id) setSchoolId(String(schoolJson.school.id))

        const normalizedConfig = normalizeTimetableConfig(configJson?.config)
        setTimetableConfig(normalizedConfig)
        const resolvedSlots = resolveSchoolTimeSlots(
          normalizedConfig,
          Array.isArray(configJson?.timeSlots) ? configJson.timeSlots : []
        ) as TimeSlot[]
        if (resolvedSlots.length) {
          setTimeSlots(resolvedSlots)
          setStoreTimeSlots(resolvedSlots as any)
        }

        const subjectList = Array.isArray(subjectsJson?.data) ? subjectsJson.data : []
        const subjectRefs = subjectList.map((s: any) => ({
          id: String(s.id),
          name: String(s.name),
        }))
        const subjectsByName = new Map<string, { id: string; name: string }>()
        for (const s of subjectRefs) subjectsByName.set(String(s.name).toLowerCase(), s)

        const teacherList = Array.isArray(teachersJson?.data) ? teachersJson.data : []
        const classList = Array.isArray(classesJson?.data) ? classesJson.data : []

        const mappedTeachers = teacherList.map((t: any) =>
          toTeacher(t, subjectsByName, normalizedConfig)
        )
        const mappedClasses = classList.map((c: any) => toClass(c, subjectRefs))

        setTeachers(mappedTeachers)
        setClasses(mappedClasses)
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load timetable data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [setStoreTimeSlots])

  useEffect(() => {
    loadAllocationNotifications()
    const timer = setInterval(loadAllocationNotifications, 25000)
    return () => clearInterval(timer)
  }, [loadAllocationNotifications])

  useEffect(() => {
    const run = async () => {
      if (tab !== 'allocations') return
      setAllocationsLoading(true)
      try {
        const [pending, entries, deptList] = await Promise.all([
          loadPendingAllocations(),
          loadMasterTimetableEntries(),
          loadDepartments(),
        ])
        setPendingAllocations(pending)
        setMasterEntries(entries)
        setDepartments(deptList)
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load allocation workflow')
      } finally {
        setAllocationsLoading(false)
      }
    }
    run()
  }, [loadDepartments, loadMasterTimetableEntries, loadPendingAllocations, tab])

  useEffect(() => {
    if (!reviewOpen) return
    loadReview(currentPendingId).catch(() => {})
  }, [currentPendingId, loadReview, reviewOpen])

  const seasonAssignments = useMemo(
    () => filterAssignmentsForUiSeason(assignments, season),
    [assignments, season]
  )

  const stats = useMemo(() => {
    const c = conflictCount()
    return {
      classCount: classes.length,
      teacherCount: teachers.length,
      conflicts: c,
      published: isPublished,
      pending: pendingChanges.length,
      lastPublished: lastPublishedAt ? lastPublishedAt.toLocaleString() : null,
    }
  }, [
    classes.length,
    teachers.length,
    conflictCount,
    isPublished,
    pendingChanges.length,
    lastPublishedAt,
  ])

  const departmentsComplete = useMemo(() => {
    const ids = new Set<string>()
    for (const e of masterEntries)
      ids.add(String(e?.departmentId || e?.department?.id || '').trim())
    ids.delete('')
    return ids
  }, [masterEntries])

  const departmentProgressLabel = useMemo(() => {
    const total = departments.length || 0
    const complete = departmentsComplete.size
    return `${complete} / ${total || '?'} departments complete`
  }, [departments.length, departmentsComplete.size])

  const masterByDepartment = useMemo(() => {
    const groups = new Map<string, any[]>()
    for (const e of masterEntries) {
      const name = String(e?.department?.name || 'Department').trim()
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name)!.push(e)
    }
    return Array.from(groups.entries())
      .map(([deptName, entries]) => {
        const merged = new Map<string, any>()
        for (const e of entries) {
          const gradeKey = (Array.isArray(e?.classes) ? e.classes : [])
            .map((c: string) => normalizeGradeLabel(c))
            .filter(Boolean)
            .sort()
            .join('|')
          const mergeKey = `${e?.teacherId}|${e?.subject}|${gradeKey}`
          if (merged.has(mergeKey)) {
            const prev = merged.get(mergeKey)
            merged.set(mergeKey, { ...prev, _mergeCount: (prev._mergeCount || 1) + 1 })
          } else {
            merged.set(mergeKey, { ...e, _mergeCount: 1 })
          }
        }
        return [deptName, Array.from(merged.values())] as [string, any[]]
      })
      .sort((a, b) => a[0].localeCompare(b[0]))
  }, [masterEntries])

  useEffect(() => {
    setTerm(String(searchParams.get('term') || 'Term 1'))
    setAcademicYear(String(searchParams.get('academicYear') || new Date().getFullYear()))
  }, [searchParams])

  useEffect(() => {
    const run = async () => {
      await loadBellSchedule()
      await loadFromApi({ term, academicYear, status: 'draft' })
      if (useTimetableStore.getState().assignments.length === 0) {
        await loadFromApi({ term, academicYear, status: 'published' })
      }
    }
    run()
  }, [term, academicYear, loadFromApi, loadBellSchedule])

  const autoResolvedRef = useRef('')
  useEffect(() => {
    const key = `${term}|${academicYear}`
    if (autoResolvedRef.current === key) return
    if (assignments.length === 0) return
    const before = useTimetableStore.getState().getConflictCount()
    if (before === 0) {
      autoResolvedRef.current = key
      return
    }
    autoResolvedRef.current = key
    const result = autoResolveConflicts()
    if (result.resolvedCount > 0) {
      toast.success(`Resolved ${result.resolvedCount} conflict(s) automatically`)
    }
  }, [term, academicYear, assignments.length, autoResolveConflicts])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/timetable/teacher-colors', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        if (data.map) setTeacherColors(data.map)
        const missing = (Array.isArray(data.colors) ? data.colors : []).filter(
          (c: { fromDatabase?: boolean }) => !c.fromDatabase
        )
        if (missing.length > 0 && !cancelled) {
          await fetch('/api/timetable/teacher-colors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autoAssign: true }),
          })
          const res2 = await fetch('/api/timetable/teacher-colors', { cache: 'no-store' })
          const data2 = await res2.json().catch(() => ({}))
          if (!cancelled && data2.map) setTeacherColors(data2.map)
        }
      } catch {
        /* colours are optional; grid still uses hash fallback */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setTeacherColors])

  const onAssignmentChange = async (a: Assignment) => {
    updateAssignment(a.id, {
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
      period: a.period,
      isBreak: a.isBreak,
    })

    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: a.id,
          term,
          academicYear,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          periodNumber: a.period,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save timetable change')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save timetable change')
      await loadFromApi({ term, academicYear, status: 'draft' })
    }
  }

  const onDeleteAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch('/api/timetable/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: assignmentId, term, academicYear }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to delete timetable entry')
      removeAssignment(assignmentId as any)
      toast.success('Deleted')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete timetable entry')
    }
  }

  const suggestionsByAssignmentId = (assignmentId: string) => {
    return useTimetableStore.getState().suggestResolutions(assignmentId as any)
  }

  const onApplySuggestion = (sug: any) => {
    try {
      const next = sug.apply()
      replaceAssignments(next, { source: 'optimize' })
      toast.success('Suggestion applied')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to apply suggestion')
    }
  }

  const onResolveAll = (_sugs?: any[]) => {
    try {
      const before = useTimetableStore.getState().getConflictCount()
      if (before === 0) return
      const result = autoResolveConflicts()
      if (result.resolvedCount > 0) {
        toast.success(
          `Resolved ${result.resolvedCount} conflict(s)` +
            (result.remainingConflicts > 0 ? ` — ${result.remainingConflicts} remaining` : '')
        )
      } else if (result.remainingConflicts > 0) {
        toast.error('No free period for some grades — reduce allocation or add periods.')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to resolve all')
    }
  }

  const canPublish = stats.conflicts === 0 && assignments.length > 0

  const coverBaseSlots = useMemo(() => {
    const map = new Map<string, TimeSlot>()
    for (const s of timeSlots) {
      const key = `${s.period}|${s.startTime}|${s.endTime}|${s.isBreak ? 1 : 0}`
      if (!map.has(key)) map.set(key, { ...s, dayOfWeek: 'monday' })
    }
    return Array.from(map.values())
      .filter((s) => !s.isBreak)
      .sort((a, b) => a.period - b.period)
  }, [timeSlots])

  const coverDays = useMemo(() => {
    const set = new Set<string>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    for (const s of timeSlots) set.add(String(s.dayOfWeek))
    return Array.from(set)
  }, [timeSlots])

  useEffect(() => {
    if (!teachers.length) return
    if (!coverTeacherId) setCoverTeacherId(String(teachers[0]?.id || ''))
  }, [teachers, coverTeacherId])

  useEffect(() => {
    if (!coverDays.includes(coverDay)) setCoverDay(coverDays[0] || 'monday')
  }, [coverDays, coverDay])

  useEffect(() => {
    const valid = coverBaseSlots.some((s) => s.period === coverPeriod)
    if (!valid) setCoverPeriod(coverBaseSlots[0]?.period || 1)
  }, [coverBaseSlots, coverPeriod])

  const coverSuggestions = useMemo(() => {
    const teacherById = new Map<string, Teacher>()
    for (const t of teachers) teacherById.set(String(t.id), t)

    const absent = seasonAssignments.filter(
      (a) =>
        String(a.teacherId) === String(coverTeacherId) &&
        String(a.dayOfWeek) === String(coverDay) &&
        Number(a.period) === Number(coverPeriod)
    )

    const busy = new Map<string, number>()
    for (const a of seasonAssignments) {
      busy.set(String(a.teacherId), (busy.get(String(a.teacherId)) || 0) + 1)
    }

    const isTeacherFree = (teacherId: string) => {
      return (
        seasonAssignments.find(
          (a) =>
            String(a.teacherId) === String(teacherId) &&
            String(a.dayOfWeek) === String(coverDay) &&
            Number(a.period) === Number(coverPeriod)
        ) == null
      )
    }

    const suggestions = absent.map((lesson) => {
      const candidates = teachers
        .filter((t) => String(t.id) !== String(coverTeacherId))
        .filter((t) => isTeacherFree(String(t.id)))
        .filter((t) => (t.subjects || []).some((s) => String(s.id) === String(lesson.subjectId)))
        .map((t) => {
          const load = busy.get(String(t.id)) || 0
          return { teacher: t, load }
        })
        .sort((a, b) => a.load - b.load)
        .slice(0, 5)

      return { lesson, candidates }
    })

    const absentTeacher = teacherById.get(String(coverTeacherId))
    return { absentTeacher, suggestions }
  }, [seasonAssignments, teachers, coverTeacherId, coverDay, coverPeriod])

  const reloadTimetable = async () => {
    setReloadingTimetable(true)
    try {
      await loadFromApi({ term, academicYear, status: 'draft' })
      if (useTimetableStore.getState().assignments.length === 0) {
        await loadFromApi({ term, academicYear, status: 'published' })
      }
      toast.success('Timetable reloaded')
    } catch (e: any) {
      toast.error(e?.message || 'Reload failed')
    } finally {
      setReloadingTimetable(false)
    }
  }

  const saveSolverDraftToDb = async () => {
    if (!assignments.length) {
      toast.error('Generate a timetable first')
      return
    }
    try {
      const res = await fetch('/api/timetable/entries/sync-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          term,
          academicYear,
          assignments,
          replaceExisting: true,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save draft')
      toast.success(`Saved ${json.saved ?? 0} periods to database`)
      await loadFromApi({ term, academicYear, status: 'draft' })
    } catch (e: any) {
      toast.error(e?.message || 'Save failed')
    }
  }

  const generateFromAllocations = async () => {
    setDbGenerating(true)
    try {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ term, academicYear, replaceExisting: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json?.error || 'Generation failed'
        if (json?.partial && Array.isArray(json?.conflicts)) {
          setUnplacedLessons(json.conflicts.map(parseUnplacedConflict))
        }
        throw new Error(msg)
      }
      const conflicts = Array.isArray(json?.conflicts) ? json.conflicts : []
      setUnplacedLessons(conflicts.map(parseUnplacedConflict))
      const unplaced = Number(json?.summary?.unplaced ?? json?.stats?.unplaced ?? 0)
      toast.success(
        unplaced > 0
          ? `Generated ${Number(json?.generated || 0)} periods — ${unplaced} block(s) still unplaced`
          : `Generated ${Number(json?.generated || 0)} periods`
      )
      await loadFromApi({ term, academicYear, status: 'draft' })
      setGridMode('wall')
      setTab('overview')
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed')
    } finally {
      setDbGenerating(false)
    }
  }

  return (
    <DashboardLayout title="Master Timetable">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-bold text-royalPurple-text1">ZSMS Timetable Studio</div>
            <div className="text-sm text-royalPurple-text3">
              aSc-style class wall — compact subject blocks, no rooms, teacher + class only
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AllocationNotificationBell
              onOpenAllocations={() => {
                setTab('allocations')
                setReviewIndex(0)
                setRejectionReason('')
                setReviewOpen(true)
              }}
            />
            <Button
              onClick={generateFromAllocations}
              disabled={dbGenerating}
              className="zsms-hover-raise"
            >
              {dbGenerating ? 'Generating…' : 'Generate Perfect Timetable'}
            </Button>
            <Button variant="outline" onClick={saveSolverDraftToDb} className="zsms-hover-raise">
              Save draft to DB
            </Button>
            <Button
              onClick={async () => {
                if (!canPublish) return
                setDbPublishing(true)
                try {
                  if (assignments.length) {
                    const syncRes = await fetch('/api/timetable/entries/sync-draft', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        term,
                        academicYear,
                        assignments,
                        replaceExisting: true,
                      }),
                    })
                    const syncJson = await syncRes.json().catch(() => ({}))
                    if (!syncRes.ok) {
                      throw new Error(syncJson?.error || 'Save draft to database before publishing')
                    }
                  }
                  const r = await fetch('/api/timetable/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ term, academicYear }),
                  })
                  const j = await r.json().catch(() => ({}))
                  if (!r.ok) throw new Error(j?.message || j?.error || 'Failed to publish')
                  publish()
                  toast.success(`Published ${j.published ?? 0} periods`)
                  await loadFromApi({ term, academicYear, status: 'published' })
                } catch (e: any) {
                  toast.error(e?.message || 'Failed to publish to database')
                } finally {
                  setDbPublishing(false)
                }
              }}
              disabled={!canPublish || dbPublishing}
              className="zsms-hover-raise"
            >
              {dbPublishing ? 'Publishing…' : 'Publish'}
            </Button>
            <select
              className="zsms-select max-w-[140px]"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
            <input
              className="zsms-input max-w-[120px]"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              inputMode="numeric"
            />
            <select
              className="zsms-select max-w-[180px]"
              value={season}
              onChange={(e) => setSeason(e.target.value as any)}
            >
              <option value="normal">Normal</option>
              <option value="planting">Planting</option>
              <option value="farming">Farming</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="onboard-card p-4">
            <div className="text-xs text-royalPurple-text3">Classes</div>
            <div className="text-xl font-bold text-royalPurple-text1">{stats.classCount}</div>
          </div>
          <div className="onboard-card p-4">
            <div className="text-xs text-royalPurple-text3">Teachers</div>
            <div className="text-xl font-bold text-royalPurple-text1">{stats.teacherCount}</div>
          </div>
          <div className="onboard-card p-4">
            <div className="text-xs text-royalPurple-text3">Conflicts</div>
            <div className={`text-xl font-bold ${stats.conflicts === 0 ? 'kpi-pass' : 'kpi-fail'}`}>
              {stats.conflicts}
            </div>
          </div>
          <div className="onboard-card p-4">
            <div className="text-xs text-royalPurple-text3">Status</div>
            <div className={`text-xl font-bold ${stats.published ? 'kpi-pass' : 'kpi-warn'}`}>
              {stats.published ? 'Published' : 'Draft'}
            </div>
          </div>
          <div className="onboard-card p-4">
            <div className="text-xs text-royalPurple-text3">Pending</div>
            <div className="text-xl font-bold text-royalPurple-text1">{stats.pending}</div>
          </div>
        </div>

        <TimetableControlBar
          gridMode={gridMode}
          onGridModeChange={setGridMode}
          onUndo={undo}
          onRedo={redo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onReload={reloadTimetable}
          reloading={reloadingTimetable}
          conflictCount={stats.conflicts}
          isPublished={stats.published}
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-royalPurple-border/30 pb-2">
          {(
            [
              { id: 'assignment', label: 'Teacher Period Assignment' },
              { id: 'overview', label: 'Overview' },
              { id: 'edit', label: 'Edit' },
              { id: 'conflicts', label: 'Conflicts' },
              { id: 'cover', label: 'Daily Cover' },
              { id: 'settings', label: 'Settings' },
              { id: 'allocations', label: 'Department Allocations' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                tab === t.id
                  ? 'bg-royalPurple-accent text-white border-royalPurple-accent'
                  : 'bg-royalPurple-card/40 text-royalPurple-text2 border-royalPurple-border/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'allocations' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="onboard-card p-5">
                <div className="text-royalPurple-text1 font-bold text-lg">Pending Allocations</div>
                <div className="text-royalPurple-text3 text-sm mt-1">
                  {allocationsLoading
                    ? 'Loading…'
                    : `${pendingAllocations.length} pending department allocations`}
                </div>
                <div className="mt-3">
                  <Button
                    onClick={() => {
                      setReviewIndex(0)
                      setRejectionReason('')
                      setReviewOpen(true)
                    }}
                    disabled={allocationsLoading || pendingAllocations.length === 0}
                    className="zsms-hover-raise"
                  >
                    Review now
                  </Button>
                </div>
              </div>
              <div className="onboard-card p-5">
                <div className="text-royalPurple-text1 font-bold text-lg">Master Progress</div>
                <div className="text-royalPurple-text3 text-sm mt-1">{departmentProgressLabel}</div>
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-royalPurple-card/40 overflow-hidden">
                    <div
                      className="h-2 bg-royalPurple-accent"
                      style={{
                        width:
                          departments.length > 0
                            ? `${Math.min(
                                100,
                                Math.round((departmentsComplete.size / departments.length) * 100)
                              )}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="onboard-card p-5">
                <div className="text-royalPurple-text1 font-bold text-lg">Approved Entries</div>
                <div className="text-royalPurple-text3 text-sm mt-1">
                  {allocationsLoading ? 'Loading…' : `${masterEntries.length} entries`}
                </div>
              </div>
            </div>

            {masterByDepartment.length === 0 ? (
              <div className="onboard-card p-5">
                <div className="text-royalPurple-text2 text-sm">No approved entries yet.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {masterByDepartment.map(([deptName, entries]) => (
                  <div key={deptName} className="onboard-card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-royalPurple-text1 font-bold text-lg">{deptName}</div>
                      <div className="text-xs text-royalPurple-text3 font-semibold">
                        {entries.length} approved
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {entries.map((e: any) => (
                        <div
                          key={String(e.id)}
                          className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4"
                        >
                          <div className="text-sm font-bold text-royalPurple-text1">
                            {String(e?.teacher?.name || 'Teacher')}
                            {e?._mergeCount > 1 ? (
                              <span className="ml-2 text-xs font-semibold text-royalPurple-text3">
                                ×{e._mergeCount} merged
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-royalPurple-text3 mt-1">
                            <span className="font-semibold text-royalPurple-text2">Grades:</span>{' '}
                            {Array.isArray(e?.classes)
                              ? e.classes.join(', ')
                              : String(e?.classes || '')}
                          </div>
                          <div className="text-xs text-royalPurple-text3 mt-1">
                            <span className="font-semibold text-royalPurple-text2">Subject:</span>{' '}
                            {String(e?.subject || '')}
                          </div>
                          <div className="text-xs text-royalPurple-text3 mt-1">
                            <span className="font-semibold text-royalPurple-text2">
                              Period config:
                            </span>{' '}
                            {formatPeriodDisplay(e?.periodConfiguration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reviewOpen ? (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
                <div className="w-full max-w-2xl rounded-2xl border border-royalPurple-border/40 bg-royalPurple-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-royalPurple-text1 font-bold text-lg">
                        Allocation Review
                      </div>
                      <div className="text-royalPurple-text3 text-sm mt-1">
                        {pendingAllocations.length === 0
                          ? 'No pending allocations'
                          : `Pending ${reviewIndex + 1} of ${pendingAllocations.length}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewOpen(false)}
                      className="rounded-lg border border-royalPurple-border/40 bg-royalPurple-card/40 px-3 py-2 text-royalPurple-text2 hover:bg-royalPurple-card/60"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {pendingAllocations.length === 0 ? (
                    <div className="mt-4 text-royalPurple-text2 text-sm">Nothing to review.</div>
                  ) : reviewLoading ? (
                    <div className="mt-4 text-royalPurple-text2 text-sm">Loading details…</div>
                  ) : !reviewData ? (
                    <div className="mt-4 text-royalPurple-text2 text-sm">
                      Failed to load details.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4">
                          <div className="text-xs text-royalPurple-text3">Department</div>
                          <div className="text-sm font-bold text-royalPurple-text1">
                            {String(reviewData?.department?.name || '')}
                          </div>
                        </div>
                        <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4">
                          <div className="text-xs text-royalPurple-text3">Teacher</div>
                          <div className="text-sm font-bold text-royalPurple-text1">
                            {String(
                              reviewData?.teacherName ||
                                teachers.find(
                                  (t) =>
                                    String(t.id) === String(reviewData?.teacherUserId || '') ||
                                    String(t.id) === String(reviewData?.teacherId || '')
                                )?.fullName ||
                                reviewData?.teacherId ||
                                ''
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4">
                          <div className="text-xs text-royalPurple-text3">Classes</div>
                          <div className="text-sm font-semibold text-royalPurple-text1">
                            {Array.isArray(reviewData?.classes)
                              ? reviewData.classes.join(', ')
                              : String(reviewData?.classes || '')}
                          </div>
                        </div>
                        <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4">
                          <div className="text-xs text-royalPurple-text3">Subject</div>
                          <div className="text-sm font-semibold text-royalPurple-text1">
                            {String(reviewData?.subject || '')}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4">
                        <div className="text-xs text-royalPurple-text3">Season</div>
                        <div className="text-sm font-semibold text-royalPurple-text1">
                          {String(reviewData?.term || 'Term 1')} ·{' '}
                          {String(reviewData?.academicYear || academicYear)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4">
                        <div className="text-xs text-royalPurple-text3">Period config</div>
                        <div className="text-sm font-semibold text-royalPurple-text1 break-words">
                          {formatPeriodDisplay(reviewData?.periodConfig)}
                        </div>
                      </div>

                      <div className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-card/30 p-4">
                        <div className="text-xs text-royalPurple-text3">Reject feedback</div>
                        <textarea
                          className="zsms-input mt-2 w-full"
                          rows={3}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason for rejection (required to reject)"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 justify-between">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setReviewIndex((i) => Math.max(0, i - 1))
                              setRejectionReason('')
                            }}
                            disabled={reviewIndex === 0 || reviewSubmitting}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setReviewIndex((i) => Math.min(pendingAllocations.length - 1, i + 1))
                              setRejectionReason('')
                            }}
                            disabled={
                              reviewIndex >= pendingAllocations.length - 1 || reviewSubmitting
                            }
                          >
                            Next
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              const id = currentPendingId
                              if (!id) return
                              setReviewSubmitting(true)
                              try {
                                const res = await fetch(
                                  `/api/admin/allocations/${encodeURIComponent(id)}/approve`,
                                  {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      term: reviewData?.term || term,
                                      academicYear: reviewData?.academicYear || academicYear,
                                    }),
                                  }
                                )
                                const json = await res.json().catch(() => ({}))
                                if (!res.ok)
                                  throw new Error(json?.message || json?.error || 'Approve failed')
                                const synced = Number(json?.timetableAllocationsSynced || 0)
                                const approvedTerm = String(json?.term || reviewData?.term || term)
                                const approvedYear = String(
                                  json?.academicYear || reviewData?.academicYear || academicYear
                                )
                                if (approvedTerm !== term) setTerm(approvedTerm)
                                if (approvedYear !== academicYear) setAcademicYear(approvedYear)
                                toast.success(
                                  synced > 0
                                    ? `Approved — ${synced} teaching allocation row(s) ready for timetable (${approvedTerm}, ${approvedYear})`
                                    : 'Approved ✓'
                                )
                                const nextPending = pendingAllocations.filter(
                                  (a) => String(a.id) !== id
                                )
                                setPendingAllocations(nextPending)
                                setReviewIndex((i) =>
                                  Math.min(i, Math.max(0, nextPending.length - 1))
                                )
                                setRejectionReason('')
                                const nextEntries = await loadMasterTimetableEntries().catch(
                                  () => []
                                )
                                setMasterEntries(nextEntries)
                                await loadAllocationNotifications()
                                if (nextPending.length === 0) setReviewOpen(false)
                              } catch (e: any) {
                                toast.error(e?.message || 'Approve failed')
                              } finally {
                                setReviewSubmitting(false)
                              }
                            }}
                            disabled={reviewSubmitting}
                            className="zsms-hover-raise"
                          >
                            <Check size={16} /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const id = currentPendingId
                              const reason = String(rejectionReason || '').trim()
                              if (!id) return
                              if (!reason) return toast.error('Enter rejection feedback')
                              setReviewSubmitting(true)
                              try {
                                const res = await fetch(
                                  `/api/admin/allocations/${encodeURIComponent(id)}/reject`,
                                  {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ rejectionReason: reason }),
                                  }
                                )
                                const json = await res.json().catch(() => ({}))
                                if (!res.ok)
                                  throw new Error(json?.message || json?.error || 'Reject failed')
                                toast.success('Rejected')
                                const nextPending = pendingAllocations.filter(
                                  (a) => String(a.id) !== id
                                )
                                setPendingAllocations(nextPending)
                                setReviewIndex((i) =>
                                  Math.min(i, Math.max(0, nextPending.length - 1))
                                )
                                setRejectionReason('')
                                await loadAllocationNotifications()
                                if (nextPending.length === 0) setReviewOpen(false)
                              } catch (e: any) {
                                toast.error(e?.message || 'Reject failed')
                              } finally {
                                setReviewSubmitting(false)
                              }
                            }}
                            disabled={reviewSubmitting}
                            className="zsms-hover-raise"
                          >
                            <X size={16} /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'overview' ? (
          <div className="space-y-4">
            {gridMode === 'wall' ? (
              <AscClassWallGrid
                assignments={seasonAssignments}
                timeSlots={timeSlots}
                classes={classes}
                teachers={teachers}
                season={uiSeasonToDetectorSeason(season) === 'harvest' ? 'farming' : season}
                showConflicts
                unplacedLessons={unplacedLessons}
              />
            ) : gridMode === 'master' ? (
              <MasterTimetableGrid
                assignments={seasonAssignments}
                timeSlots={timeSlots}
                classes={classes}
                teachers={teachers}
                season={uiSeasonToDetectorSeason(season) === 'harvest' ? 'farming' : season}
                showConflicts
                editable
                onDeleteAssignment={onDeleteAssignment}
              />
            ) : (
              <TimetableEntityView
                mode={gridMode}
                assignments={seasonAssignments}
                timeSlots={timeSlots}
                teachers={teachers}
                classes={classes}
              />
            )}
          </div>
        ) : null}

        {tab === 'assignment' ? (
          <div className="space-y-4">
            <div className="onboard-card p-5">
              <div className="text-royalPurple-text1 font-bold text-lg">How it works</div>
              <ol className="list-decimal list-inside text-royalPurple-text2 space-y-1 text-sm mt-2">
                <li>HOD assigns key teachers to specific periods (locked)</li>
                <li>Headteacher generates draft (solver respects locks)</li>
                <li>Review, resolve conflicts, then publish</li>
              </ol>
            </div>

            {schoolId ? (
              <TeacherPeriodAssignmentUI schoolId={schoolId} timetableVersionId={undefined} />
            ) : (
              <div className="onboard-card p-5">
                <div className="text-royalPurple-text2 text-sm">Loading school context…</div>
              </div>
            )}
          </div>
        ) : null}

        {tab === 'edit' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <DragDropTimetable
                assignments={seasonAssignments}
                timeSlots={timeSlots}
                teachers={teachers}
                studentClasses={classes}
                onAssignmentChange={onAssignmentChange}
                onConflictDetected={() => setTab('conflicts')}
                season={uiSeasonToDetectorSeason(season)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={undo} className="zsms-hover-raise">
                  Undo
                </Button>
                <Button variant="outline" onClick={redo} className="zsms-hover-raise">
                  Redo
                </Button>
              </div>
            </div>
            <div>
              <ConflictDisplay
                conflicts={conflicts}
                suggestionsByAssignmentId={suggestionsByAssignmentId}
                onApplySuggestion={onApplySuggestion}
                onUndo={undo}
                onResolveAll={onResolveAll}
              />
            </div>
          </div>
        ) : null}

        {tab === 'conflicts' ? (
          <ConflictDisplay
            conflicts={conflicts}
            suggestionsByAssignmentId={suggestionsByAssignmentId}
            onApplySuggestion={onApplySuggestion}
            onUndo={undo}
            onResolveAll={onResolveAll}
          />
        ) : null}

        {tab === 'settings' ? (
          <div className="space-y-6">
            <SchoolTimetableSettings
              onSaved={({ config, timeSlots: slots }) => {
                const normalized = normalizeTimetableConfig(config)
                setTimetableConfig(normalized)
                if (slots?.length) {
                  setTimeSlots(slots as TimeSlot[])
                  setStoreTimeSlots(slots as any)
                }
                setTeachers((prev) =>
                  prev.map((t) => ({
                    ...t,
                    availability: buildTeacherAvailabilityFromConfig(
                      normalized
                    ) as Teacher['availability'],
                  }))
                )
              }}
            />
            <TimePeriodManager />
            <TeacherColorAssignment />
          </div>
        ) : null}

        {tab === 'cover' ? (
          <div className="space-y-4">
            <div className="onboard-card p-5">
              <div className="text-royalPurple-text1 font-bold text-lg">Daily Cover</div>
              <div className="text-royalPurple-text2 text-sm mt-1">
                Mark a teacher absent and apply best-match cover suggestions (free + qualified + low
                workload).
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="onboard-card p-4">
                <div className="text-xs text-royalPurple-text3">Absent teacher</div>
                <select
                  className="zsms-select w-full mt-2"
                  value={coverTeacherId}
                  onChange={(e) => setCoverTeacherId(e.target.value)}
                >
                  {teachers.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="onboard-card p-4">
                <div className="text-xs text-royalPurple-text3">Day</div>
                <select
                  className="zsms-select w-full mt-2"
                  value={coverDay}
                  onChange={(e) => setCoverDay(e.target.value)}
                >
                  {coverDays.slice(0, 5).map((d) => (
                    <option key={d} value={d}>
                      {d.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="onboard-card p-4">
                <div className="text-xs text-royalPurple-text3">Period</div>
                <select
                  className="zsms-select w-full mt-2"
                  value={String(coverPeriod)}
                  onChange={(e) => setCoverPeriod(Number(e.target.value) || 1)}
                >
                  {coverBaseSlots.map((s) => (
                    <option key={`${s.period}`} value={String(s.period)}>
                      P{s.period} ({s.startTime}-{s.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="onboard-card p-4">
                <div className="text-xs text-royalPurple-text3">Season</div>
                <div className="mt-2 text-sm font-semibold text-royalPurple-text1">{season}</div>
              </div>
            </div>

            <div className="onboard-card p-5">
              <div className="text-sm font-bold text-royalPurple-text1">Suggestions</div>
              <div className="text-xs text-royalPurple-text3 mt-1">
                {coverSuggestions.absentTeacher
                  ? `Absent: ${coverSuggestions.absentTeacher.fullName}`
                  : 'Select a teacher'}
              </div>

              <div className="mt-4 space-y-3">
                {coverSuggestions.suggestions.length ? (
                  coverSuggestions.suggestions.map(({ lesson, candidates }) => (
                    <div
                      key={String(lesson.id)}
                      className="rounded-xl border border-royalPurple-border/40 bg-royalPurple-deep/40 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-royalPurple-text1">
                            {(lesson as any).subjectName || 'Subject'} ·{' '}
                            {(lesson as any).className || `Class ${lesson.classId}`}
                          </div>
                          <div className="text-xs text-royalPurple-text3">
                            {String(lesson.dayOfWeek)} P{lesson.period} ({lesson.startTime}-
                            {lesson.endTime})
                          </div>
                        </div>
                      </div>

                      {candidates.length ? (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {candidates.map((c) => (
                            <div
                              key={String(c.teacher.id)}
                              className="rounded-lg border border-royalPurple-border/40 bg-royalPurple-card/40 px-3 py-2 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-royalPurple-text1 truncate">
                                  {c.teacher.fullName}
                                </div>
                                <div className="text-xs text-royalPurple-text3">
                                  Current load: {c.load} periods
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                onClick={async () => {
                                  updateAssignment(lesson.id, { teacherId: c.teacher.id })
                                  try {
                                    const res = await fetch('/api/timetable/entries', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({
                                        id: lesson.id,
                                        teacherId: c.teacher.id,
                                        term,
                                        academicYear,
                                      }),
                                    })
                                    const json = await res.json().catch(() => ({}))
                                    if (!res.ok) {
                                      throw new Error(json?.error || 'Failed to save cover')
                                    }
                                    toast.success('Cover teacher saved to draft')
                                  } catch (err: any) {
                                    toast.error(err?.message || 'Cover save failed')
                                    await loadFromApi({ term, academicYear, status: 'draft' })
                                  }
                                }}
                                className="zsms-hover-raise"
                              >
                                Assign
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-royalPurple-text2">
                          No qualified + free cover teacher found for this slot.
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-royalPurple-text2">
                    No lessons found for this teacher at the selected day/period.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
