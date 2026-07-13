'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { ConflictDisplay } from '@/components/timetable/ConflictDisplay'
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
import { filterClassesForWallGrid, inferClassGrade } from '@/lib/timetable/activeClasses'
import { normalizeGradeLabel } from '@/lib/timetable/zambiaTerminology'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import {
  readStoredTimetableSeason,
  writeStoredTimetableSeason,
} from '@/lib/timetable/timetableSeasonPreference'
import {
  persistAssignmentDelete,
  persistAssignmentMove,
  persistAssignmentSwap,
  persistClearTimetable,
} from '@/lib/timetable/timetableMutations'
import type { Assignment, Class, Teacher, TimeSlot } from '@/lib/timetable/types'
import { Check, X, Pencil, Trash2 } from 'lucide-react'
import { AdminAllocationEditDialog } from '@/components/timetable/AdminAllocationEditDialog'
import { TeacherCompliancePanel } from '@/components/compliance/TeacherCompliancePanel'
import {
  GenerationProgressModal,
  type GenerationProgressState,
} from '@/components/timetable/GenerationProgressModal'
import {
  useTimetableDraftMeta,
  conflictAuditKey,
  canDismissAuditRow,
} from '@/hooks/useTimetableDraftMeta'

type Tab = 'assignment' | 'overview' | 'edit' | 'conflicts' | 'cover' | 'settings' | 'allocations'
type ConflictIssueFilter = 'all' | 'missing' | 'feasibility'

type FeasibilityUiConflict = {
  id: string
  type: 'FEASIBILITY_ERROR'
  severity: 'error'
  description: string
  suggestedFix?: string
}

const TAB_VALUES: Tab[] = [
  'assignment',
  'overview',
  'edit',
  'conflicts',
  'cover',
  'settings',
  'allocations',
]

function parseTabFromSearchParams(sp: URLSearchParams): Tab {
  const raw = String(sp.get('tab') || sp.get('view') || 'edit').toLowerCase()
  return TAB_VALUES.includes(raw as Tab) ? (raw as Tab) : 'edit'
}

function parseGridModeFromSearchParams(sp: URLSearchParams): TimetableGridMode {
  const raw = String(sp.get('grid') || 'wall').toLowerCase()
  if (raw === 'wall' || raw === 'master' || raw === 'teacher' || raw === 'class') return raw
  return 'wall'
}

function formatPeriodDisplay(value: unknown, classes?: unknown): string {
  return formatPeriodConfigLabel(value as any, { classes: classes as any }) || String(value || '')
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
  const yearGroup = String(c?.yearGroup || c?.year_group || c?.grade || '').trim()
  const grade = inferClassGrade(name, yearGroup) as Class['grade']
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
  const [tab, setTab] = useState<Tab>(() => parseTabFromSearchParams(searchParams))
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState(() => {
    const fromUrl = String(searchParams.get('term') || '').trim()
    if (fromUrl) return fromUrl
    const stored = readStoredTimetableSeason()
    return stored?.term || 'Term 1'
  })
  const [academicYear, setAcademicYear] = useState(() => {
    const fromUrl = String(searchParams.get('academicYear') || '').trim()
    if (fromUrl) return fromUrl
    const stored = readStoredTimetableSeason()
    return stored?.academicYear || String(new Date().getFullYear())
  })
  const focusClass = String(searchParams.get('focusClass') || '')
    .trim()
    .toLowerCase()
  const focusSubject = String(searchParams.get('focusSubject') || '')
    .trim()
    .toLowerCase()
  const focusTeacher = String(searchParams.get('focusTeacher') || '')
    .trim()
    .toLowerCase()
  const focusClassId = String(searchParams.get('focusClassId') || '').trim()
  const focusSubjectId = String(searchParams.get('focusSubjectId') || '').trim()
  const focusTeacherId = String(searchParams.get('focusTeacherId') || '').trim()
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
  const [allocationsClearing, setAllocationsClearing] = useState(false)
  const [editAllocationId, setEditAllocationId] = useState('')
  const [editAllocationData, setEditAllocationData] = useState<any | null>(null)
  const [seasonAllocations, setSeasonAllocations] = useState<any[]>([])
  const [gridMode, setGridMode] = useState<TimetableGridMode>(() =>
    parseGridModeFromSearchParams(searchParams)
  )
  const [unplacedLessons, setUnplacedLessons] = useState<UnplacedLesson[]>([])
  const [reloadingTimetable, setReloadingTimetable] = useState(false)
  const [lockedPeriodKeys, setLockedPeriodKeys] = useState<Set<string>>(() => new Set())
  const [lastInfeasibility, setLastInfeasibility] = useState<{
    code: string
    message: string
    details?: string[]
  } | null>(null)
  const [preflightWarnings, setPreflightWarnings] = useState<string[]>([])
  const [feasibilityErrors, setFeasibilityErrors] = useState<FeasibilityUiConflict[]>([])
  const [feasibilityLoading, setFeasibilityLoading] = useState(false)
  const [conflictIssueFilter, setConflictIssueFilter] = useState<ConflictIssueFilter>(() => {
    const raw = String(searchParams.get('filter') || 'all').toLowerCase()
    if (raw === 'missing' || raw === 'feasibility') return raw
    return 'all'
  })
  const [dismissingAuditKey, setDismissingAuditKey] = useState<string | null>(null)
  const [genProgress, setGenProgress] = useState<GenerationProgressState>({
    open: false,
    stage: 'idle',
    message: '',
  })

  const assignments = useTimetableStore((s) => s.assignments)
  const isPublished = useTimetableStore((s) => s.isPublished)
  const conflicts = useTimetableStore((s) => s.conflicts)
  const updateAssignment = useTimetableStore((s) => s.updateAssignment)
  const removeAssignment = useTimetableStore((s) => s.removeAssignment)
  const replaceAssignments = useTimetableStore((s) => s.replaceAssignments)
  const undo = useTimetableStore((s) => s.undo)
  const redo = useTimetableStore((s) => s.redo)
  const undoStack = useTimetableStore((s) => s.undoStack)
  const redoStack = useTimetableStore((s) => s.redoStack)
  const publish = useTimetableStore((s) => s.publish)
  const lastPublishedAt = useTimetableStore((s) => s.lastPublishedAt)
  const pendingChanges = useTimetableStore((s) => s.pendingChanges)
  const loadFromApi = useTimetableStore((s) => s.loadFromApi)
  const reloadFromServer = useTimetableStore((s) => s.reloadFromServer)
  const detectConflicts = useTimetableStore((s) => s.detectConflicts)
  const loadBellSchedule = useTimetableStore((s) => s.loadBellSchedule)
  const autoResolveConflicts = useTimetableStore((s) => s.autoResolveConflicts)
  const setStoreTimeSlots = useTimetableStore((s) => s.setTimeSlots)
  const setTeacherColors = useTimetableStore((s) => s.setTeacherColors)

  const {
    meta: draftMeta,
    loading: draftMetaLoading,
    rescan: rescanDraftConflicts,
    dismissAudit,
    isFresh: draftMetaFresh,
  } = useTimetableDraftMeta({ term, academicYear })

  const loadLockedPeriodAssignments = useCallback(async () => {
    try {
      const res = await sessionFetch('/api/timetable/teacherPeriodAssignments', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return
      const rows = Array.isArray(json?.data) ? json.data : []
      const keys = new Set<string>()
      for (const row of rows) {
        if (!row?.lockedForGeneration) continue
        const ts = row?.timeSlot
        if (!ts || ts.isBreak) continue
        keys.add(
          `${String(row.teacherId)}|${String(ts.dayOfWeek || '').toLowerCase()}|${Number(ts.period) || 1}`
        )
      }
      setLockedPeriodKeys(keys)
    } catch {
      /* optional */
    }
  }, [])

  const loadAllocationNotifications = useCallback(async () => {
    try {
      const res = await sessionFetch('/api/admin/notifications', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return
      /* AllocationNotificationBell fetches its own count */
    } catch {}
  }, [])

  const loadPendingAllocations = useCallback(async () => {
    const res = await sessionFetch('/api/admin/allocations/pending', {
      cache: 'no-store',
      credentials: 'include',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok)
      throw new Error(json?.message || json?.error || 'Failed to load pending allocations')
    return Array.isArray(json?.allocations) ? json.allocations : []
  }, [])

  const loadMasterTimetableEntries = useCallback(async () => {
    const res = await sessionFetch('/api/admin/master-timetable', {
      cache: 'no-store',
      credentials: 'include',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok)
      throw new Error(json?.message || json?.error || 'Failed to load master timetable entries')
    return Array.isArray(json?.entries) ? json.entries : []
  }, [])

  const loadSeasonAllocations = useCallback(async () => {
    const qs = new URLSearchParams({ term, academicYear })
    const res = await sessionFetch(`/api/admin/allocations?${qs.toString()}`, {
      cache: 'no-store',
      credentials: 'include',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load allocations')
    return Array.isArray(json?.allocations) ? json.allocations : []
  }, [term, academicYear])

  const loadDepartments = useCallback(async () => {
    try {
      const res = await sessionFetch('/api/departments', {
        cache: 'no-store',
        credentials: 'include',
      })
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
      const res = await sessionFetch(
        `/api/admin/allocations/${encodeURIComponent(allocationId)}/review`,
        {
          cache: 'no-store',
          credentials: 'include',
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.message || json?.error || 'Failed to load allocation details')
      setReviewData(json?.data || null)
    } finally {
      setReviewLoading(false)
    }
  }, [])

  const refreshAllocationWorkflow = useCallback(async () => {
    const [pending, entries, seasonRows] = await Promise.all([
      loadPendingAllocations().catch(() => []),
      loadMasterTimetableEntries().catch(() => []),
      loadSeasonAllocations().catch(() => []),
    ])
    setPendingAllocations(pending)
    setMasterEntries(entries)
    setSeasonAllocations(seasonRows)
    if (currentPendingId) {
      await loadReview(currentPendingId).catch(() => {})
    }
  }, [
    currentPendingId,
    loadMasterTimetableEntries,
    loadPendingAllocations,
    loadReview,
    loadSeasonAllocations,
  ])

  const deleteAdminAllocation = useCallback(
    async (allocationId: string) => {
      if (!allocationId) return
      if (
        !window.confirm(
          'Delete this allocation? Synced timetable rows for this submission will be removed.'
        )
      ) {
        return
      }
      try {
        const res = await sessionFetch(
          `/api/admin/allocations/${encodeURIComponent(allocationId)}`,
          { method: 'DELETE' }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.message || json?.error || 'Delete failed')
        toast.success('Allocation deleted')
        await refreshAllocationWorkflow()
      } catch (e: any) {
        toast.error(e?.message || 'Delete failed')
      }
    },
    [refreshAllocationWorkflow]
  )

  const openEditAllocation = useCallback((allocationId: string, data?: any | null) => {
    setEditAllocationId(String(allocationId))
    setEditAllocationData(data || null)
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [teachersRes, classesRes, subjectsRes, schoolRes, configRes] = await Promise.all([
          sessionFetch('/api/teachers?limit=200', { cache: 'no-store' }),
          sessionFetch(
            `/api/classes?limit=200&activeOnly=true&term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}`,
            { cache: 'no-store' }
          ),
          sessionFetch('/api/subjects?limit=500', { cache: 'no-store' }),
          sessionFetch('/api/school/current', { cache: 'no-store', credentials: 'include' }),
          sessionFetch('/api/timetable/config', { cache: 'no-store', credentials: 'include' }),
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
  }, [setStoreTimeSlots, term, academicYear])

  useEffect(() => {
    if (timeSlots.length) setStoreTimeSlots(timeSlots as any)
  }, [timeSlots, setStoreTimeSlots])

  useEffect(() => {
    loadLockedPeriodAssignments()
  }, [loadLockedPeriodAssignments, term, academicYear])

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
        const [pending, entries, deptList, seasonRows] = await Promise.all([
          loadPendingAllocations(),
          loadMasterTimetableEntries(),
          loadDepartments(),
          loadSeasonAllocations(),
        ])
        setPendingAllocations(pending)
        setMasterEntries(entries)
        setDepartments(deptList)
        setSeasonAllocations(seasonRows)
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load allocation workflow')
      } finally {
        setAllocationsLoading(false)
      }
    }
    run()
  }, [
    loadDepartments,
    loadMasterTimetableEntries,
    loadPendingAllocations,
    loadSeasonAllocations,
    tab,
    term,
    academicYear,
  ])

  useEffect(() => {
    if (!reviewOpen) return
    loadReview(currentPendingId).catch(() => {})
  }, [currentPendingId, loadReview, reviewOpen])

  const seasonAssignments = useMemo(
    () => filterAssignmentsForUiSeason(assignments, season),
    [assignments, season]
  )

  const visibleClasses = useMemo(
    () => filterClassesForWallGrid(classes, seasonAssignments),
    [classes, seasonAssignments]
  )

  const stats = useMemo(() => {
    const serverErrors = draftMeta?.conflictErrors ?? 0
    const serverWarnings = draftMeta?.conflictWarnings ?? 0
    const serverTotal = serverErrors + serverWarnings
    return {
      classCount: visibleClasses.length,
      teacherCount: teachers.length,
      /** Official count = server hard errors only (Model A). */
      conflicts: serverErrors,
      serverErrors,
      serverWarnings,
      serverTotal,
      published: isPublished,
      pending: pendingChanges.length,
      lastPublished: lastPublishedAt ? lastPublishedAt.toLocaleString() : null,
    }
  }, [
    visibleClasses.length,
    teachers.length,
    draftMeta,
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
    let cancelled = false
    ;(async () => {
      setFeasibilityLoading(true)
      try {
        const qs = new URLSearchParams({ term, academicYear })
        const res = await sessionFetch(`/api/timetable/feasibility?${qs}`, { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) {
          setFeasibilityErrors(Array.isArray(json?.feasibilityErrors) ? json.feasibilityErrors : [])
        }
      } catch {
        if (!cancelled) setFeasibilityErrors([])
      } finally {
        if (!cancelled) setFeasibilityLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [term, academicYear])

  const serverConflictRows = useMemo(() => {
    const raw = draftMeta?.conflictSummary
    if (!Array.isArray(raw)) return []
    return raw.filter((row) => row && typeof row === 'object')
  }, [draftMeta?.conflictSummary])

  const missingPeriodsCount = useMemo(() => {
    if (typeof draftMeta?.missingPeriodsCount === 'number' && draftMeta.missingPeriodsCount > 0) {
      return draftMeta.missingPeriodsCount
    }
    if (typeof draftMeta?.byType?.MISSING_PERIODS === 'number') {
      return draftMeta.byType.MISSING_PERIODS
    }
    return serverConflictRows.filter((c: any) => c.type === 'MISSING_PERIODS').length
  }, [draftMeta, serverConflictRows])

  const filteredServerConflicts = useMemo(() => {
    if (conflictIssueFilter === 'missing') {
      return serverConflictRows.filter((c: any) => c.type === 'MISSING_PERIODS')
    }
    if (conflictIssueFilter === 'feasibility') {
      return feasibilityErrors
    }
    return serverConflictRows
  }, [conflictIssueFilter, feasibilityErrors, serverConflictRows])

  const onDismissServerConflict = useCallback(
    async (row: any) => {
      const key = conflictAuditKey(row)
      if (!key) return
      setDismissingAuditKey(key)
      try {
        const result = await dismissAudit(key)
        if (result) toast.success('Audit issue dismissed')
        else toast.error('Could not dismiss audit issue')
      } catch {
        toast.error('Could not dismiss audit issue')
      } finally {
        setDismissingAuditKey(null)
      }
    },
    [dismissAudit]
  )

  const onDismissAllMissingPeriods = useCallback(async () => {
    const keys = serverConflictRows
      .filter((row: any) => row.type === 'MISSING_PERIODS')
      .map((row: any) => conflictAuditKey(row))
      .filter(Boolean)
    if (!keys.length) return
    setDismissingAuditKey('__all_missing__')
    try {
      const result = await dismissAudit(keys)
      if (result) toast.success(`Dismissed ${keys.length} missing-period warning(s)`)
      else toast.error('Could not dismiss warnings')
    } catch {
      toast.error('Could not dismiss warnings')
    } finally {
      setDismissingAuditKey(null)
    }
  }, [dismissAudit, serverConflictRows])

  useEffect(() => {
    const urlTerm = String(searchParams.get('term') || '').trim()
    const urlYear = String(searchParams.get('academicYear') || '').trim()
    if (urlTerm) setTerm(urlTerm)
    if (urlYear) setAcademicYear(urlYear)
    if (!urlTerm && !urlYear) {
      // Prefer the school season that actually has periods when URL is bare.
      ;(async () => {
        try {
          const res = await sessionFetch('/api/timetable/active-season', {
            credentials: 'include',
            cache: 'no-store',
          })
          if (!res.ok) return
          const season = await res.json()
          if (Number(season?.total || 0) > 0 && season?.term && season?.academicYear) {
            setTerm(String(season.term))
            setAcademicYear(String(season.academicYear))
          }
        } catch {
          /* keep current */
        }
      })()
    }
    setTab(parseTabFromSearchParams(searchParams))
    setGridMode(parseGridModeFromSearchParams(searchParams))
    const rawFilter = String(searchParams.get('filter') || 'all').toLowerCase()
    if (rawFilter === 'missing' || rawFilter === 'feasibility') setConflictIssueFilter(rawFilter)
    else setConflictIssueFilter('all')
  }, [searchParams])

  useEffect(() => {
    writeStoredTimetableSeason(term, academicYear)
  }, [term, academicYear])

  useEffect(() => {
    if (tab !== 'allocations') return
    if (
      !focusClass &&
      !focusSubject &&
      !focusTeacher &&
      !focusClassId &&
      !focusSubjectId &&
      !focusTeacherId
    ) {
      return
    }
    const t = window.setTimeout(() => {
      const el = document.querySelector('[id^="alloc-focus-"]')
      if (el && 'scrollIntoView' in el) {
        ;(el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [
    tab,
    seasonAllocations,
    focusClass,
    focusSubject,
    focusTeacher,
    focusClassId,
    focusSubjectId,
    focusTeacherId,
  ])

  useEffect(() => {
    const run = async () => {
      await reloadFromServer({ term, academicYear, status: 'draft' })
      const slots = useTimetableStore.getState().timeSlots
      if (slots.length) setTimeSlots(slots as TimeSlot[])
    }
    run()
  }, [term, academicYear, reloadFromServer])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await sessionFetch('/api/timetable/teacher-colors', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        if (data.map) setTeacherColors(data.map)
        const missing = (Array.isArray(data.colors) ? data.colors : []).filter(
          (c: { fromDatabase?: boolean }) => !c.fromDatabase
        )
        if (missing.length > 0 && !cancelled) {
          await sessionFetch('/api/timetable/teacher-colors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autoAssign: true }),
          })
          const res2 = await sessionFetch('/api/timetable/teacher-colors', { cache: 'no-store' })
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

  const mutationCtx = useMemo(
    () => ({ term, academicYear, loadFromApi }),
    [term, academicYear, loadFromApi]
  )

  const onAssignmentChange = async (a: Assignment) => {
    await persistAssignmentMove(a, mutationCtx)
  }

  const onSwapAssignments = async (nextA: Assignment, nextB: Assignment) => {
    await persistAssignmentSwap(nextA, nextB, mutationCtx)
  }

  const onDeleteAssignment = async (assignmentId: string) => {
    await persistAssignmentDelete(assignmentId as Assignment['id'], mutationCtx)
  }

  const onClearTimetable = async () => {
    const ok = window.confirm(
      'Clear all draft timetable entries for this term? This cannot be undone.'
    )
    if (!ok) return
    await persistClearTimetable(mutationCtx)
  }

  const onClearDepartmentAllocations = async () => {
    const seasonLabel = `${term} · ${academicYear}`
    const ok = window.confirm(
      `Remove ALL HOD department allocations for ${seasonLabel}?\n\nThis deletes draft, pending, approved, and rejected submissions so HODs can submit fresh ones. This cannot be undone.`
    )
    if (!ok) return
    const alsoClearDraft = window.confirm(
      'Also clear the draft timetable grid for this term? (Recommended when resetting the schedule.)'
    )
    setAllocationsClearing(true)
    try {
      const res = await sessionFetch('/api/admin/allocations/clear', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          term,
          academicYear,
          includeSyncedTeacherAllocations: true,
          includeDraftTimetable: alsoClearDraft,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Failed to clear department allocations')
      }
      const removed = Number(json?.departmentAllocationsDeleted || 0)
      toast.success(
        removed > 0
          ? `Cleared ${removed} department allocation(s) for ${seasonLabel}`
          : `No department allocations found for ${seasonLabel}`
      )
      const [pending, entries] = await Promise.all([
        loadPendingAllocations().catch(() => []),
        loadMasterTimetableEntries().catch(() => []),
      ])
      setPendingAllocations(pending)
      setMasterEntries(entries)
      setReviewOpen(false)
      await loadAllocationNotifications()
      if (alsoClearDraft) {
        await loadFromApi({ term, academicYear })
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to clear department allocations')
    } finally {
      setAllocationsClearing(false)
    }
  }

  const suggestionsByAssignmentId = useCallback(
    (assignmentId: string) => {
      const bellSlots = timeSlots.length > 0 ? timeSlots : useTimetableStore.getState().timeSlots
      return useTimetableStore.getState().suggestResolutions(assignmentId as any, {
        timeSlots: bellSlots as any,
      })
    },
    [timeSlots]
  )

  const onApplySuggestion = (sug: any) => {
    try {
      const current = useTimetableStore.getState().assignments
      const next = typeof sug.apply === 'function' ? sug.apply(current) : sug.preview
      replaceAssignments(next, { source: 'optimize' })
      detectConflicts()
      toast.success('Suggestion applied')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to apply suggestion')
    }
  }

  const onResolveAll = () => {
    try {
      if (timeSlots.length) setStoreTimeSlots(timeSlots as any)
      const before = useTimetableStore.getState().getConflictCount()
      if (before === 0) return
      const result = autoResolveConflicts()
      detectConflicts()
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

  const canPublish =
    assignments.length > 0 &&
    feasibilityErrors.length === 0 &&
    draftMeta != null &&
    draftMeta.canPublish &&
    (draftMeta.conflictErrors ?? 0) === 0

  const openMissingConflictsTab = () => {
    setConflictIssueFilter('missing')
    setTab('conflicts')
  }

  const openFeasibilityConflictsTab = () => {
    setConflictIssueFilter('feasibility')
    setTab('conflicts')
  }

  const conflictCentreHref = `/dashboard/headteacher/timetable/conflicts?term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}`

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
      await reloadFromServer({ term, academicYear, status: 'draft' })
      if (useTimetableStore.getState().isPublished) {
        const res = await sessionFetch('/api/timetable/entries/clone-published-to-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ term, academicYear }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to create draft')
        await reloadFromServer({ term, academicYear, status: 'draft' })
        toast.success(json?.message || `Editable draft created (${json?.created ?? 0} periods)`)
      } else {
        toast.success('Timetable reloaded from server')
      }
      const slots = useTimetableStore.getState().timeSlots
      if (slots.length) setTimeSlots(slots as TimeSlot[])
      detectConflicts()
      await rescanDraftConflicts()
    } catch (e: any) {
      toast.error(e?.message || 'Reload failed')
    } finally {
      setReloadingTimetable(false)
    }
  }

  const saveSolverDraftToDb = async () => {
    const store = useTimetableStore.getState()
    const rows = store.assignments
    if (!rows.length) {
      toast.error('Generate a timetable first')
      return
    }

    const criticalCount = store.getCriticalDoubleBookingCount()
    if (criticalCount > 0) {
      toast.error(
        `Cannot save: ${criticalCount} double-booking conflict${criticalCount === 1 ? '' : 's'} must be resolved first. Use Auto-fix conflicts or drag lessons to fix them.`
      )
      return
    }

    try {
      const res = await sessionFetch('/api/timetable/entries/sync-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          term,
          academicYear,
          assignments: rows,
          replaceExisting: true,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save draft')
      toast.success(`Saved ${json.saved ?? 0} periods to database`)
      await reloadFromServer({ term, academicYear, status: 'draft' })
      const slots = useTimetableStore.getState().timeSlots
      if (slots.length) setTimeSlots(slots as TimeSlot[])
      detectConflicts()
      await rescanDraftConflicts()
    } catch (e: any) {
      toast.error(e?.message || 'Save failed')
    }
  }

  const generateFromAllocations = async () => {
    if (feasibilityErrors.length > 0) {
      setLastInfeasibility({
        code: 'FEASIBILITY',
        message: feasibilityErrors[0]?.description || 'Allocations cannot fit the bell schedule.',
        details: feasibilityErrors.map((e) => e.description),
      })
      openFeasibilityConflictsTab()
      toast.error('Fix feasibility errors before generating')
      return
    }
    setDbGenerating(true)
    replaceAssignments([], { source: 'generate' })
    setGenProgress({
      open: true,
      stage: 'preflight',
      message: 'Checking teacher load, locks, and bell schedule…',
    })
    try {
      const res = await sessionFetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          term,
          academicYear,
          replaceExisting: true,
          allowPartial: false,
          maxExecutionMs: 45000,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json?.error || 'Generation failed'
        if (json?.partial && Array.isArray(json?.conflicts)) {
          setUnplacedLessons(json.conflicts.map(parseUnplacedConflict))
        }
        setLastInfeasibility(json?.infeasibility || null)
        setPreflightWarnings(Array.isArray(json?.preflightWarnings) ? json.preflightWarnings : [])
        setGenProgress({
          open: true,
          stage: 'error',
          message: msg,
          stats: {
            placed: Number(json?.stats?.placed ?? 0),
            unplaced: Number(json?.stats?.unplaced ?? json?.conflicts?.length ?? 0),
            backtracks: json?.stats?.backtracks,
            restarts: json?.stats?.restarts,
            engine: json?.engine,
          },
          infeasibility: json?.infeasibility,
          preflightWarnings: json?.preflightWarnings,
        })
        throw new Error(msg)
      }
      const conflicts = Array.isArray(json?.conflicts) ? json.conflicts : []
      setUnplacedLessons(conflicts.map(parseUnplacedConflict))
      setLastInfeasibility(null)
      setPreflightWarnings(Array.isArray(json?.preflightWarnings) ? json.preflightWarnings : [])
      setGenProgress({
        open: true,
        stage: 'done',
        message: `Placed all ${Number(json?.summary?.placed ?? json?.stats?.placed ?? 0)} lesson blocks with zero hard conflicts.`,
        stats: {
          placed: Number(json?.summary?.placed ?? json?.stats?.placed ?? 0),
          unplaced: Number(json?.summary?.unplaced ?? json?.stats?.unplaced ?? 0),
          backtracks: json?.stats?.backtracks,
          restarts: json?.stats?.restarts,
          engine: json?.engine,
        },
        preflightWarnings: json?.preflightWarnings,
      })
      toast.success(`Generated ${Number(json?.generated || 0)} periods — conflict-free`)
      await reloadFromServer({ term, academicYear, status: 'draft' })
      const slots = useTimetableStore.getState().timeSlots
      if (slots.length) setTimeSlots(slots as TimeSlot[])
      detectConflicts()
      await rescanDraftConflicts()
      await loadLockedPeriodAssignments()
      setGridMode('wall')
      setTab('edit')
    } catch (e: any) {
      if (!genProgress.open || genProgress.stage !== 'error') {
        toast.error(e?.message || 'Generation failed')
      }
      try {
        await reloadFromServer({ term, academicYear, status: 'draft' })
        if (useTimetableStore.getState().assignments.length === 0) {
          await reloadFromServer({ term, academicYear, status: 'published' })
        }
        const slots = useTimetableStore.getState().timeSlots
        if (slots.length) setTimeSlots(slots as TimeSlot[])
      } catch {
        /* keep empty grid if reload also fails */
      }
    } finally {
      setDbGenerating(false)
    }
  }

  const onDropUnplacedLesson = async (payload: {
    lesson: UnplacedLesson
    classId: string
    day: string
    period: number
  }) => {
    const slot = timeSlots.find(
      (s) =>
        !s.isBreak &&
        String(s.dayOfWeek).toLowerCase() === payload.day &&
        Number(s.period) === payload.period
    )
    if (!slot) {
      toast.error('Invalid cell')
      return
    }
    toast('Manual placement from unplaced tray — sync draft after editing', { icon: 'ℹ️' })
    setUnplacedLessons((prev) => prev.filter((u) => u.id !== payload.lesson.id))
  }

  return (
    <DashboardLayout title="Master Timetable">
      <GenerationProgressModal
        state={genProgress}
        onClose={() => setGenProgress((s) => ({ ...s, open: false, stage: 'idle' }))}
      />
      <div className="space-y-6">
        {tab === 'overview' && <TeacherCompliancePanel domain="attendance" />}
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
              variant="outline"
              onClick={() => {
                if (timeSlots.length) setStoreTimeSlots(timeSlots as any)
                const result = autoResolveConflicts()
                detectConflicts()
                if (result.resolvedCount > 0) {
                  toast.success(`Auto-fixed ${result.resolvedCount} conflict(s)`)
                } else if (result.remainingConflicts > 0) {
                  toast.error(
                    `${result.remainingConflicts} conflict(s) remain — regenerate or edit manually`
                  )
                } else {
                  toast.success('No conflicts to fix')
                }
              }}
              className="zsms-hover-raise"
            >
              Auto-fix conflicts
            </Button>
            <Button
              onClick={generateFromAllocations}
              disabled={dbGenerating || feasibilityLoading || feasibilityErrors.length > 0}
              className="zsms-hover-raise"
              title={
                feasibilityErrors.length > 0
                  ? 'Fix feasibility errors on the Conflicts tab before generating'
                  : undefined
              }
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
                    const store = useTimetableStore.getState()
                    const criticalCount = store.getCriticalDoubleBookingCount()
                    if (criticalCount > 0) {
                      throw new Error(
                        `Cannot save: ${criticalCount} double-booking conflict${criticalCount === 1 ? '' : 's'} must be resolved first.`
                      )
                    }
                    const syncRes = await sessionFetch('/api/timetable/entries/sync-draft', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        term,
                        academicYear,
                        assignments: store.assignments,
                        replaceExisting: true,
                      }),
                    })
                    const syncJson = await syncRes.json().catch(() => ({}))
                    if (!syncRes.ok) {
                      throw new Error(syncJson?.error || 'Save draft to database before publishing')
                    }
                    await reloadFromServer({ term, academicYear, status: 'draft' })
                  }
                  const r = await sessionFetch('/api/timetable/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ term, academicYear }),
                  })
                  const j = await r.json().catch(() => ({}))
                  if (!r.ok) throw new Error(j?.message || j?.error || 'Failed to publish')
                  publish()
                  toast.success(`Published ${j.published ?? 0} periods`)
                  await reloadFromServer({ term, academicYear, status: 'published' })
                  const slots = useTimetableStore.getState().timeSlots
                  if (slots.length) setTimeSlots(slots as TimeSlot[])
                  detectConflicts()
                  await rescanDraftConflicts()
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

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="onboard-card p-4">
            <div className="text-xs text-royalPurple-text3">Classes</div>
            <div className="text-xl font-bold text-royalPurple-text1">{stats.classCount}</div>
          </div>
          <div className="onboard-card p-4">
            <div className="text-xs text-royalPurple-text3">Teachers</div>
            <div className="text-xl font-bold text-royalPurple-text1">{stats.teacherCount}</div>
          </div>
          <button
            type="button"
            onClick={openMissingConflictsTab}
            className="onboard-card p-4 text-left hover:border-amber-400/60 transition-colors"
          >
            <div className="text-xs text-royalPurple-text3">Missing</div>
            {missingPeriodsCount > 0 ? (
              <div className="text-xl font-bold kpi-warn">
                {missingPeriodsCount} period{missingPeriodsCount === 1 ? '' : 's'}
              </div>
            ) : (
              <div className="text-xl font-bold kpi-pass">0</div>
            )}
            <div className="text-[10px] text-royalPurple-text3 mt-1">
              Unplaced allocation periods
            </div>
          </button>
          <div className="onboard-card p-4">
            <div className="text-xs text-royalPurple-text3">Conflicts (server)</div>
            {stats.serverErrors > 0 ? (
              <Link
                href={conflictCentreHref}
                className="text-xl font-bold kpi-fail hover:opacity-80 underline underline-offset-2 block"
                title="Open Conflict Resolution Centre"
              >
                {stats.serverErrors} error{stats.serverErrors === 1 ? '' : 's'} →
              </Link>
            ) : stats.serverWarnings > 0 ? (
              <Link
                href={conflictCentreHref}
                className="text-xl font-bold kpi-warn hover:opacity-80 underline underline-offset-2 block"
                title="Review warnings in Conflict Resolution Centre"
              >
                {stats.serverWarnings} warning{stats.serverWarnings === 1 ? '' : 's'} →
              </Link>
            ) : (
              <div className="text-xl font-bold kpi-pass">0</div>
            )}
            {draftMetaFresh ? (
              <div className="text-[10px] text-royalPurple-text3 mt-1">Last scan synced</div>
            ) : draftMetaLoading ? (
              <div className="text-[10px] text-royalPurple-text3 mt-1">Loading server scan…</div>
            ) : (
              <div className="text-[10px] text-royalPurple-text3 mt-1">Rescan to refresh</div>
            )}
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
          conflictCount={stats.serverErrors}
          isPublished={stats.published}
        />

        <div className="flex justify-end print:hidden">
          <Link
            href="/dashboard/headteacher/timetable/class-view"
            className="text-xs font-semibold text-royalPurple-accent hover:underline"
          >
            Open class-by-class grid view →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-royalPurple-border/30 pb-2">
          <p className="w-full text-xs text-royalPurple-text3 mb-1 print:hidden">
            Use the <span className="font-semibold text-royalPurple-text2">Edit</span> tab with{' '}
            <span className="font-semibold text-royalPurple-text2">Class wall</span> (default) for
            the compact aSc-style grid, or switch to{' '}
            <span className="font-semibold text-royalPurple-text2">By period</span> to drag lessons
            on the master grid.
          </p>
          {(
            [
              { id: 'assignment', label: 'Teacher Period Assignment' },
              { id: 'overview', label: 'Overview' },
              { id: 'edit', label: 'Edit' },
              {
                id: 'conflicts',
                label:
                  stats.serverErrors > 0
                    ? `Conflicts (${stats.serverErrors})`
                    : stats.serverWarnings > 0
                      ? `Conflicts (${stats.serverWarnings})`
                      : 'Conflicts',
              },
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
                            {formatPeriodDisplay(e?.periodConfiguration, e?.classes)}
                          </div>
                          {e?.allocationId ? (
                            <div className="mt-3 flex gap-2">
                              <Button
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                onClick={() => openEditAllocation(String(e.allocationId))}
                              >
                                <Pencil size={14} className="mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                className="h-8 px-2 text-xs border-red-500/40 text-red-200"
                                onClick={() => deleteAdminAllocation(String(e.allocationId))}
                              >
                                <Trash2 size={14} className="mr-1" />
                                Delete
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {seasonAllocations.length > 0 ? (
              <div className="onboard-card p-5">
                <div className="text-royalPurple-text1 font-bold text-lg">
                  All department allocations ({term} · {academicYear})
                </div>
                <p className="text-sm text-royalPurple-text3 mt-1">
                  Edit or remove any HOD submission — including approved rows that feed timetable
                  generation.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-royalPurple-text3 border-b border-royalPurple-border/30">
                        <th className="py-2 pr-3">Department</th>
                        <th className="py-2 pr-3">Subject</th>
                        <th className="py-2 pr-3">Classes</th>
                        <th className="py-2 pr-3">Periods</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonAllocations.map((row: any) => {
                        const data =
                          row?.allocationData && typeof row.allocationData === 'object'
                            ? row.allocationData
                            : {}
                        const classes = Array.isArray(data.classes)
                          ? data.classes.join(', ')
                          : String(data.classes || '')
                        const subjectLabel = String(data.subject || '').toLowerCase()
                        const teacherLabel = String(
                          data.teacherName || row?.teacherName || ''
                        ).toLowerCase()
                        const classLabels = String(classes).toLowerCase()
                        const isFocused =
                          (focusSubject && subjectLabel.includes(focusSubject)) ||
                          (focusClass && classLabels.includes(focusClass)) ||
                          (focusTeacher && teacherLabel.includes(focusTeacher)) ||
                          (focusTeacherId &&
                            String(data.teacherId || row?.teacherId || '') === focusTeacherId) ||
                          (focusSubjectId && String(data.subjectId || '') === focusSubjectId) ||
                          (focusClassId &&
                            (Array.isArray(data.classIds)
                              ? data.classIds.map(String).includes(focusClassId)
                              : false))
                        return (
                          <tr
                            key={String(row.id)}
                            id={isFocused ? `alloc-focus-${row.id}` : undefined}
                            className={`border-b border-royalPurple-border/20 text-royalPurple-text2 ${
                              isFocused ? 'bg-amber-50/80 ring-1 ring-amber-300' : ''
                            }`}
                          >
                            <td className="py-2 pr-3">{row?.department?.name || '—'}</td>
                            <td className="py-2 pr-3">{String(data.subject || '—')}</td>
                            <td className="py-2 pr-3">{classes || '—'}</td>
                            <td className="py-2 pr-3">
                              {formatPeriodDisplay(data.periodConfig, data.classes)}
                            </td>
                            <td className="py-2 pr-3 font-semibold">{String(row.status || '')}</td>
                            <td className="py-2 text-right whitespace-nowrap">
                              <Button
                                variant="outline"
                                className="h-8 px-2 text-xs mr-1"
                                onClick={() => openEditAllocation(String(row.id))}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                className="h-8 px-2 text-xs border-red-500/40 text-red-200"
                                onClick={() => deleteAdminAllocation(String(row.id))}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="onboard-card p-5 border border-red-500/30">
              <div className="text-royalPurple-text1 font-bold text-lg">Reset HOD allocations</div>
              <p className="text-sm text-royalPurple-text3 mt-2 max-w-2xl">
                Remove all department allocation submissions for{' '}
                <span className="font-semibold text-royalPurple-text2">
                  {term} · {academicYear}
                </span>
                . HODs can create and submit fresh allocations after this reset.
              </p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={onClearDepartmentAllocations}
                  disabled={allocationsLoading || allocationsClearing}
                  className="border-red-500/40 text-red-200 hover:bg-red-500/10"
                >
                  {allocationsClearing ? 'Clearing…' : 'Clear all department allocations'}
                </Button>
              </div>
            </div>

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
                          {formatPeriodDisplay(reviewData?.periodConfig, reviewData?.classes)}
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
                            variant="outline"
                            onClick={() => {
                              if (currentPendingId) {
                                openEditAllocation(currentPendingId, reviewData)
                              }
                            }}
                            disabled={reviewSubmitting || !currentPendingId}
                          >
                            <Pencil size={16} /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-500/40 text-red-200"
                            onClick={() => {
                              if (currentPendingId) deleteAdminAllocation(currentPendingId)
                            }}
                            disabled={reviewSubmitting || !currentPendingId}
                          >
                            <Trash2 size={16} /> Delete
                          </Button>
                          <Button
                            onClick={async () => {
                              const id = currentPendingId
                              if (!id) return
                              setReviewSubmitting(true)
                              try {
                                const res = await sessionFetch(
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
                                const res = await sessionFetch(
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
                classes={visibleClasses}
                teachers={teachers}
                season={uiSeasonToDetectorSeason(season) === 'harvest' ? 'farming' : season}
                showConflicts
                serverConflictErrors={stats.serverErrors}
                unplacedLessons={unplacedLessons}
                lockedPeriodKeys={lockedPeriodKeys}
                onDropUnplaced={onDropUnplacedLesson}
              />
            ) : gridMode === 'master' ? (
              <MasterTimetableGrid
                assignments={seasonAssignments}
                timeSlots={timeSlots}
                classes={visibleClasses}
                teachers={teachers}
                season={uiSeasonToDetectorSeason(season) === 'harvest' ? 'farming' : season}
                showConflicts
                editable
                enableDragDrop
                onAssignmentChange={onAssignmentChange}
                onSwapAssignments={onSwapAssignments}
                onDeleteAssignment={onDeleteAssignment}
              />
            ) : (
              <TimetableEntityView
                mode={gridMode}
                assignments={seasonAssignments}
                timeSlots={timeSlots}
                teachers={teachers}
                classes={visibleClasses}
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
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_min(100%,280px)] gap-4 xl:gap-6 items-start">
            <div className="min-w-0 overflow-hidden">
              {isPublished ? (
                <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Viewing the <strong>published</strong> timetable. Load the draft to edit or
                    delete individual periods.
                  </span>
                  <Button
                    variant="outline"
                    className="h-8"
                    onClick={() => reloadTimetable()}
                    disabled={reloadingTimetable}
                  >
                    {reloadingTimetable ? 'Loading…' : 'Load draft'}
                  </Button>
                </div>
              ) : null}
              {gridMode === 'wall' ? (
                <AscClassWallGrid
                  assignments={seasonAssignments}
                  timeSlots={timeSlots}
                  classes={visibleClasses}
                  teachers={teachers}
                  season={uiSeasonToDetectorSeason(season) === 'harvest' ? 'farming' : season}
                  showConflicts
                  serverConflictErrors={stats.serverErrors}
                  unplacedLessons={unplacedLessons}
                  lockedPeriodKeys={lockedPeriodKeys}
                  onDropUnplaced={onDropUnplacedLesson}
                />
              ) : gridMode === 'master' ? (
                <>
                  <MasterTimetableGrid
                    assignments={seasonAssignments}
                    timeSlots={timeSlots}
                    classes={visibleClasses}
                    teachers={teachers}
                    season={uiSeasonToDetectorSeason(season) === 'harvest' ? 'farming' : season}
                    showConflicts
                    editable
                    enableDragDrop
                    onAssignmentChange={onAssignmentChange}
                    onSwapAssignments={onSwapAssignments}
                    onDeleteAssignment={onDeleteAssignment}
                    onConflictDetected={() => setTab('conflicts')}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={undo} className="zsms-hover-raise">
                      Undo
                    </Button>
                    <Button variant="outline" onClick={redo} className="zsms-hover-raise">
                      Redo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onClearTimetable}
                      className="zsms-hover-raise text-red-400 border-red-500/40"
                    >
                      Clear timetable
                    </Button>
                  </div>
                </>
              ) : (
                <TimetableEntityView
                  mode={gridMode}
                  assignments={seasonAssignments}
                  timeSlots={timeSlots}
                  teachers={teachers}
                  classes={visibleClasses}
                />
              )}
            </div>
            <div className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
              <ConflictDisplay
                conflicts={conflicts}
                assignments={seasonAssignments}
                classes={visibleClasses}
                unplacedLessons={unplacedLessons}
                suggestionsByAssignmentId={suggestionsByAssignmentId}
                onApplySuggestion={onApplySuggestion}
                onUndo={undo}
                onResolveAll={onResolveAll}
              />
            </div>
          </div>
        ) : null}

        {tab === 'conflicts' ? (
          <div className="space-y-4">
            <div className="onboard-card p-4 border border-royalPurple-border/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-royalPurple-text1">Server conflict audit</div>
                  <div className="text-sm text-royalPurple-text3 mt-1">
                    {draftMetaLoading
                      ? 'Loading draft conflict summary…'
                      : draftMeta?.lastScannedAt
                        ? `Last scanned ${new Date(draftMeta.lastScannedAt).toLocaleString()}`
                        : 'No scan yet — generate a timetable or rescan'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <span
                      className={
                        stats.serverErrors > 0 ? 'text-red-600 font-medium' : 'text-green-700'
                      }
                    >
                      {stats.serverErrors} error{stats.serverErrors === 1 ? '' : 's'}
                    </span>
                    <span className="text-amber-700">
                      {stats.serverWarnings} warning{stats.serverWarnings === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={draftMetaLoading}
                    onClick={() => rescanDraftConflicts()}
                    className="zsms-hover-raise"
                  >
                    Rescan
                  </Button>
                  <Link href={conflictCentreHref}>
                    <Button size="sm" className="zsms-hover-raise">
                      Open Conflict Centre
                    </Button>
                  </Link>
                </div>
              </div>
              <p className="text-xs text-royalPurple-text3 mt-3">
                Apply fixes that persist to the database in the Conflict Resolution Centre. Auto-fix
                below is a local preview only until you save the draft.
              </p>
            </div>
            {lastInfeasibility ? (
              <div className="onboard-card p-4 border border-red-200 bg-red-50">
                <div className="font-semibold text-red-800">Last generation issue</div>
                <div className="text-sm text-red-700 mt-1">{lastInfeasibility.message}</div>
                <ul className="mt-2 text-xs text-red-700 list-disc list-inside space-y-0.5">
                  {(lastInfeasibility.details || []).slice(0, 8).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
                <div className="mt-3 text-xs text-red-800">
                  Fix: reduce teacher load, remove conflicting locks, or adjust HOD allocations —
                  then regenerate.
                </div>
              </div>
            ) : null}
            {preflightWarnings.length > 0 ? (
              <div className="onboard-card p-4 border border-amber-200 bg-amber-50 text-sm text-amber-900">
                <div className="font-medium">Preflight warnings</div>
                <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                  {preflightWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {feasibilityErrors.length > 0 ? (
              <div className="onboard-card p-4 border border-red-300 bg-red-50">
                <div className="font-semibold text-red-800">Feasibility errors</div>
                <div className="text-xs text-red-700 mt-1">
                  Fix these before generating — allocations exceed bell-schedule capacity.
                </div>
                <ul className="mt-2 space-y-2">
                  {feasibilityErrors.map((err) => (
                    <li
                      key={err.id}
                      className="text-sm text-red-800 border border-red-200 rounded-lg px-3 py-2 bg-white/70"
                    >
                      {err.description}
                    </li>
                  ))}
                </ul>
              </div>
            ) : feasibilityLoading ? (
              <div className="text-xs text-royalPurple-text3">Checking allocation feasibility…</div>
            ) : null}
            {conflictIssueFilter !== 'all' ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-royalPurple-text2">
                  Filter: {conflictIssueFilter === 'missing' ? 'Missing Periods' : 'Feasibility'}
                </span>
                <Button variant="outline" size="sm" onClick={() => setConflictIssueFilter('all')}>
                  Show all
                </Button>
              </div>
            ) : null}
            {filteredServerConflicts.length > 0 ? (
              <div className="onboard-card p-4 border border-royalPurple-border/40 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-royalPurple-text1">
                    {conflictIssueFilter === 'feasibility'
                      ? 'Feasibility errors'
                      : conflictIssueFilter === 'missing'
                        ? 'Missing periods'
                        : 'Server audit issues'}
                  </div>
                  {missingPeriodsCount > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dismissingAuditKey === '__all_missing__' || draftMetaLoading}
                      onClick={() => onDismissAllMissingPeriods()}
                    >
                      Dismiss all missing periods
                    </Button>
                  ) : null}
                </div>
                <ul className="space-y-2">
                  {filteredServerConflicts.map((row: any, i: number) => {
                    const auditKey = conflictAuditKey(row)
                    const canDismiss = canDismissAuditRow(row) && Boolean(auditKey)
                    return (
                      <li
                        key={row.id || `srv-${i}`}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          row.severity === 'error' || row.type === 'FEASIBILITY_ERROR'
                            ? 'border-red-200 bg-red-50 text-red-800'
                            : 'border-amber-200 bg-amber-50 text-amber-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{row.type || 'CONFLICT'}</div>
                            <div className="mt-0.5">{row.description || row.message}</div>
                            {row.type === 'MISSING_PERIODS' ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Link
                                  href={
                                    row.reviewHref ||
                                    `/dashboard/headteacher/timetable?tab=allocations&term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}&focusClass=${encodeURIComponent(row.className || '')}&focusSubject=${encodeURIComponent((row.subjectNames && row.subjectNames[0]) || '')}&focusTeacher=${encodeURIComponent(row.teacherName || '')}`
                                  }
                                  className="text-xs font-medium text-amber-800 underline underline-offset-2"
                                >
                                  Review allocations
                                </Link>
                              </div>
                            ) : null}
                          </div>
                          {canDismiss ? (
                            <button
                              type="button"
                              title="Dismiss this warning"
                              aria-label="Dismiss audit issue"
                              disabled={dismissingAuditKey === auditKey || draftMetaLoading}
                              onClick={() => onDismissServerConflict(row)}
                              className="shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
            <ConflictDisplay
              conflicts={conflicts}
              assignments={seasonAssignments}
              classes={visibleClasses}
              unplacedLessons={unplacedLessons}
              suggestionsByAssignmentId={suggestionsByAssignmentId}
              onApplySuggestion={onApplySuggestion}
              onUndo={undo}
              onResolveAll={onResolveAll}
            />
          </div>
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
                                    const res = await sessionFetch('/api/timetable/entries', {
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

      <AdminAllocationEditDialog
        open={Boolean(editAllocationId)}
        allocationId={editAllocationId}
        initialData={editAllocationData}
        teachers={teachers.map((t) => ({ id: t.id, fullName: t.fullName }))}
        onClose={() => {
          setEditAllocationId('')
          setEditAllocationData(null)
        }}
        onSaved={refreshAllocationWorkflow}
      />
    </DashboardLayout>
  )
}
