'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { AutoGenerateButton } from '@/components/timetable/AutoGenerateButton'
import { ConflictDisplay } from '@/components/timetable/ConflictDisplay'
import { DragDropTimetable } from '@/components/timetable/DragDropTimetable'
import { MasterTimetableGrid } from '@/components/timetable/MasterTimetableGrid'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { useTimetableStore } from '@/lib/timetable/timetableStore'
import type {
  Assignment,
  Class,
  Classroom,
  Teacher,
  TimeSlot,
  TravelingTeacherRoute,
} from '@/lib/timetable/types'
import type { TimetableSchoolData } from '@/lib/timetable/automationService'

type Tab = 'overview' | 'edit' | 'conflicts' | 'settings'

function genTimeSlots(): TimeSlot[] {
  const days: Array<TimeSlot['dayOfWeek']> = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ]
  const periods = [
    { label: 'Period 1', start: '08:00', end: '08:40', period: 1, isBreak: false },
    { label: 'Period 2', start: '08:45', end: '09:25', period: 2, isBreak: false },
    { label: 'Period 3', start: '09:30', end: '10:10', period: 3, isBreak: false },
    { label: 'Break', start: '10:10', end: '10:30', period: 4, isBreak: true },
    { label: 'Period 4', start: '10:30', end: '11:10', period: 5, isBreak: false },
    { label: 'Period 5', start: '11:15', end: '11:55', period: 6, isBreak: false },
    { label: 'Lunch', start: '12:00', end: '12:40', period: 7, isBreak: true },
    { label: 'Period 6', start: '12:40', end: '13:20', period: 8, isBreak: false },
    { label: 'Period 7', start: '13:25', end: '14:05', period: 9, isBreak: false },
    { label: 'Period 8', start: '14:10', end: '14:50', period: 10, isBreak: false },
    { label: 'Period 9', start: '14:55', end: '15:35', period: 11, isBreak: false },
  ] as const

  const out: TimeSlot[] = []
  for (const d of days) {
    for (const p of periods) {
      out.push({
        id: `${d}-${p.period}`,
        dayOfWeek: d,
        startTime: p.start as any,
        endTime: p.end as any,
        period: p.period,
        isBreak: p.isBreak,
        label: p.label,
      })
    }
  }
  return out
}

function defaultClassrooms(count: number): Classroom[] {
  const n = Math.max(8, Math.min(60, count))
  return Array.from({ length: n }).map((_, i) => ({
    id: `room-${i + 1}`,
    name: `Rm${String(101 + i)}`,
    capacity: 50,
    equipment: ['chalkboard'],
    accessibility: ['ground-floor'],
  }))
}

function toTeacher(t: any, subjectsByName: Map<string, { id: string; name: string }>): Teacher {
  const name = String(t?.user?.name || t?.name || t?.fullName || 'Teacher').trim()
  const assigned = Array.isArray(t?.assignedSubjects) ? t.assignedSubjects : []
  const subjectRefs = assigned
    .map((n: any) => subjectsByName.get(String(n).toLowerCase()))
    .filter(Boolean)
    .map((s: any) => ({ id: s.id, name: s.name }))

  return {
    id: String(t?.id || t?.user?.id || name),
    fullName: name,
    subjects: subjectRefs,
    availability: [
      {
        season: 'all',
        dayOfWeek: 'monday',
        startTime: '07:30' as any,
        endTime: '16:30' as any,
        available: true,
      },
      {
        season: 'all',
        dayOfWeek: 'tuesday',
        startTime: '07:30' as any,
        endTime: '16:30' as any,
        available: true,
      },
      {
        season: 'all',
        dayOfWeek: 'wednesday',
        startTime: '07:30' as any,
        endTime: '16:30' as any,
        available: true,
      },
      {
        season: 'all',
        dayOfWeek: 'thursday',
        startTime: '07:30' as any,
        endTime: '16:30' as any,
        available: true,
      },
      {
        season: 'all',
        dayOfWeek: 'friday',
        startTime: '07:30' as any,
        endTime: '16:30' as any,
        available: true,
      },
    ],
    maxHours: { perWeek: Number(t?.maxHoursPerWeek || 28) },
    preferences: { minimizeGaps: true, maxTravelLegsPerDay: 1 },
    traveling: { enabled: false, schools: [] },
  }
}

function toClass(c: any, subjects: Array<{ id: string; name: string }>): Class {
  const name = String(c?.name || c?.className || 'Class').trim()
  const gradeRaw = String(c?.yearGroup || c?.year_group || c?.grade || '').match(/\d+/)?.[0]
  const grade = (Number(gradeRaw) as any) || 8
  return {
    id: String(c?.id || name),
    name,
    grade,
    students: Number(c?.studentCount || 40),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
    homeRoomId: undefined,
  }
}

export default function HeadteacherTimetablePage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => genTimeSlots())
  const [travelingTeacherRoutes, setTravelingTeacherRoutes] = useState<TravelingTeacherRoute[]>([])
  const [season, setSeason] = useState<'normal' | 'farming' | 'planting'>('normal')

  const assignments = useTimetableStore((s) => s.assignments)
  const conflicts = useTimetableStore((s) => s.conflicts)
  const updateAssignment = useTimetableStore((s) => s.updateAssignment)
  const replaceAssignments = useTimetableStore((s) => s.replaceAssignments)
  const undo = useTimetableStore((s) => s.undo)
  const publish = useTimetableStore((s) => s.publish)
  const isPublished = useTimetableStore((s) => s.isPublished)
  const lastPublishedAt = useTimetableStore((s) => s.lastPublishedAt)
  const pendingChanges = useTimetableStore((s) => s.pendingChanges)
  const conflictCount = useTimetableStore((s) => s.getConflictCount)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [teachersRes, classesRes, subjectsRes] = await Promise.all([
          fetch('/api/teachers?limit=200', { cache: 'no-store' }),
          fetch('/api/classes?limit=200', { cache: 'no-store' }),
          fetch('/api/subjects?limit=500', { cache: 'no-store' }),
        ])

        const teachersJson = await teachersRes.json().catch(() => ({}))
        const classesJson = await classesRes.json().catch(() => ({}))
        const subjectsJson = await subjectsRes.json().catch(() => ({}))

        const subjectList = Array.isArray(subjectsJson?.data) ? subjectsJson.data : []
        const subjectRefs = subjectList.map((s: any) => ({
          id: String(s.id),
          name: String(s.name),
        }))
        const subjectsByName = new Map<string, { id: string; name: string }>()
        for (const s of subjectRefs) subjectsByName.set(String(s.name).toLowerCase(), s)

        const teacherList = Array.isArray(teachersJson?.data) ? teachersJson.data : []
        const classList = Array.isArray(classesJson?.data) ? classesJson.data : []

        const mappedTeachers = teacherList.map((t: any) => toTeacher(t, subjectsByName))
        const mappedClasses = classList.map((c: any) => toClass(c, subjectRefs.slice(0, 10)))

        setTeachers(mappedTeachers)
        setClasses(mappedClasses)
        setClassrooms(defaultClassrooms(Math.max(mappedClasses.length, mappedTeachers.length)))
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load timetable data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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

  const schoolData = useMemo<TimetableSchoolData | null>(() => {
    if (!teachers.length || !classes.length || !classrooms.length || !timeSlots.length) return null
    return {
      timeSlots,
      teachers,
      classrooms,
      classes,
      travelingTeacherRoutes,
      seasonMode: season === 'farming' ? 'harvest' : season === 'planting' ? 'planting' : 'normal',
    }
  }, [timeSlots, teachers, classrooms, classes, travelingTeacherRoutes, season])

  const onAssignmentChange = (a: Assignment) => {
    updateAssignment(a.id, a)
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

  const onResolveAll = (sugs: any[]) => {
    if (!sugs?.length) return
    try {
      let next = assignments
      for (const s of sugs) next = s.apply()
      replaceAssignments(next, { source: 'optimize' })
      toast.success('Resolutions applied')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to resolve all')
    }
  }

  const canPublish = stats.conflicts === 0 && assignments.length > 0

  return (
    <DashboardLayout title="Master Timetable">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-bold text-royalPurple-text1">Master Timetable</div>
            <div className="text-sm text-royalPurple-text3">Dashboard → Timetable</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AutoGenerateButton
              schoolData={schoolData}
              disabledReason={
                schoolData
                  ? undefined
                  : loading
                    ? 'Loading data…'
                    : 'Missing teachers/classes/rooms/slots'
              }
              onDone={() => setTab('edit')}
            />
            <Button
              onClick={() => {
                if (!canPublish) return
                publish()
                toast.success('Timetable published')
              }}
              disabled={!canPublish}
              className="zsms-hover-raise"
            >
              Publish
            </Button>
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

        <div className="flex flex-wrap items-center gap-2 border-b border-royalPurple-border/30 pb-2">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'edit', label: 'Edit' },
              { id: 'conflicts', label: 'Conflicts' },
              { id: 'settings', label: 'Settings' },
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

        {tab === 'overview' ? (
          <MasterTimetableGrid
            assignments={assignments}
            timeSlots={timeSlots}
            classes={classes}
            teachers={teachers}
            classrooms={classrooms}
            season={season}
            showConflicts
          />
        ) : null}

        {tab === 'edit' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <DragDropTimetable
                assignments={assignments.filter((a) => a.season === (season as any))}
                timeSlots={timeSlots}
                teachers={teachers}
                classrooms={classrooms}
                studentClasses={classes}
                onAssignmentChange={onAssignmentChange}
                onConflictDetected={() => setTab('conflicts')}
                season={
                  season === 'farming' ? 'harvest' : season === 'planting' ? 'planting' : 'normal'
                }
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={undo} className="zsms-hover-raise">
                  Undo
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
          <div className="onboard-card p-5">
            <div className="text-royalPurple-text1 font-bold text-lg">Settings</div>
            <div className="text-royalPurple-text2 text-sm mt-2">
              Time slots, working days, seasonal settings, and constraints configuration will appear
              here.
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
