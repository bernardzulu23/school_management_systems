'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { TimetableClassView } from '@/components/timetable/TimetableClassView'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import {
  buildTeacherAvailabilityFromConfig,
  normalizeTimetableConfig,
  resolveSchoolTimeSlots,
} from '@/lib/timetable/timeSlotsFromConfig'
import { filterAssignmentsForUiSeason } from '@/lib/timetable/seasonFilter'
import { filterClassesForTimetablePicker, inferClassGrade } from '@/lib/timetable/activeClasses'
import type { Assignment, Class, Teacher, TimeSlot } from '@/lib/timetable/types'
import toast from 'react-hot-toast'

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

function ClassTimetablePageContent() {
  const [loading, setLoading] = useState(true)
  const [term] = useState('Term 1')
  const [academicYear] = useState(String(new Date().getFullYear()))
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [teacherColorMap, setTeacherColorMap] = useState<Record<string, { colorHex?: string }>>({})
  const [selectedClassId, setSelectedClassId] = useState('')

  const assignments = useTimetableStore((s) => s.assignments)
  const conflicts = useTimetableStore((s) => s.conflicts)
  const loadFromApi = useTimetableStore((s) => s.loadFromApi)
  const setStoreTimeSlots = useTimetableStore((s) => s.setTimeSlots)
  const currentSeason = useTimetableStore((s) => s.currentSeason)

  const seasonAssignments = useMemo(
    () => filterAssignmentsForUiSeason(assignments, currentSeason),
    [assignments, currentSeason]
  )

  const visibleClasses = useMemo(
    () => filterClassesForTimetablePicker(classes, seasonAssignments as Assignment[]),
    [classes, seasonAssignments]
  )

  const conflictAssignmentIds = useMemo(() => {
    const ids = new Set<string>()
    for (const [assignmentId, list] of conflicts.entries()) {
      if (list?.length) ids.add(String(assignmentId))
    }
    return ids
  }, [conflicts])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [teachersRes, classesRes, subjectsRes, configRes, colorsRes] = await Promise.all([
        sessionFetch('/api/teachers?limit=200', { cache: 'no-store' }),
        sessionFetch('/api/classes?limit=200', { cache: 'no-store' }),
        sessionFetch('/api/subjects?limit=500', { cache: 'no-store' }),
        sessionFetch('/api/timetable/config', { cache: 'no-store', credentials: 'include' }),
        sessionFetch('/api/timetable/teacher-colors', { cache: 'no-store' }),
      ])

      const teachersJson = await teachersRes.json().catch(() => ({}))
      const classesJson = await classesRes.json().catch(() => ({}))
      const subjectsJson = await subjectsRes.json().catch(() => ({}))
      const configJson = await configRes.json().catch(() => ({}))
      const colorsJson = await colorsRes.json().catch(() => ({}))

      const normalizedConfig = normalizeTimetableConfig(configJson?.config)
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
      if (colorsJson?.map && typeof colorsJson.map === 'object') {
        setTeacherColorMap(colorsJson.map)
      }

      await loadFromApi({ term, academicYear, status: 'draft' }).catch(async () => {
        await loadFromApi({ term, academicYear, status: 'published' })
      })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load class timetable view')
    } finally {
      setLoading(false)
    }
  }, [academicYear, loadFromApi, setStoreTimeSlots, term])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!visibleClasses.length) {
      if (selectedClassId) setSelectedClassId('')
      return
    }
    const ids = new Set(visibleClasses.map((c) => String(c.id)))
    if (!selectedClassId || !ids.has(selectedClassId)) {
      setSelectedClassId(String(visibleClasses[0].id))
    }
  }, [visibleClasses, selectedClassId])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/headteacher/timetable"
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-royalPurple-accent hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Master timetable
            </Link>
            <h1 className="text-2xl font-bold text-royalPurple-text">Class timetables</h1>
            <p className="mt-1 text-sm text-royalPurple-text2">
              One class at a time — period × day grid with teacher colour coding.
            </p>
          </div>
        </div>

        <TimetableClassView
          classes={visibleClasses}
          assignments={seasonAssignments as Assignment[]}
          timeSlots={timeSlots}
          teachers={teachers}
          teacherColorMap={teacherColorMap}
          conflictAssignmentIds={conflictAssignmentIds}
          selectedClassId={selectedClassId}
          onSelectClass={setSelectedClassId}
          loading={loading}
        />
      </div>
    </DashboardLayout>
  )
}

export default function ClassTimetablePage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-6 text-sm text-royalPurple-text2">Loading class timetables…</div>
        </DashboardLayout>
      }
    >
      <ClassTimetablePageContent />
    </Suspense>
  )
}
