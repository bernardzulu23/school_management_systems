'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { TeacherTimetableView } from '@/components/timetable/TeacherTimetableView'
import { TeacherWorkloadSummary } from '@/components/timetable/TeacherWorkloadSummary'
import { TimetableTermFilters } from '@/components/timetable/TimetableTermFilters'
import { useAuth } from '@/lib/auth'
import { usePublishedTimetableView } from '@/lib/timetable/usePublishedTimetableView'
import { filterClassesInUse, inferClassGrade } from '@/lib/timetable/activeClasses'

export default function TeacherTimetablePage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const teacherUserId = user?.id ? String(user.id) : undefined

  const {
    term,
    setTerm,
    academicYear,
    setAcademicYear,
    assignments,
    timeSlots,
    teacherSummaries: summaries,
    loading,
    error,
  } = usePublishedTimetableView({ enabled: Boolean(teacherUserId) })

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (!teacherUserId) return
    let cancelled = false
    ;(async () => {
      try {
        const [classesRes, subjectsRes] = await Promise.all([
          fetch('/api/classes?limit=200', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/subjects?limit=200', { cache: 'no-store', credentials: 'include' }),
        ])
        const classesJson = await classesRes.json().catch(() => ({}))
        const subjectsJson = await subjectsRes.json().catch(() => ({}))
        if (cancelled) return

        const list = Array.isArray(classesJson?.data) ? classesJson.data : []
        const mappedClasses = list.map((c) => ({
          id: c.id,
          name: c.name || c.className || 'Class',
          grade: inferClassGrade(c.name || c.className || 'Class', c.yearGroup || c.year_group),
          students: Number(c.studentCount || 40),
          subjects: [],
        }))
        setClasses(filterClassesInUse(mappedClasses, { assignments }))

        const sList = Array.isArray(subjectsJson?.subjects) ? subjectsJson.subjects : []
        setSubjects(sList.map((s) => ({ id: s.id, name: s.name })))
        setClassrooms(
          Array.from({ length: Math.max(8, list.length) }).map((_, i) => ({
            id: `room-${i + 1}`,
            name: `Rm${101 + i}`,
            capacity: 50,
            equipment: ['chalkboard'],
            accessibility: ['ground-floor'],
          }))
        )
      } catch {
        /* labels only — grid still works from assignments */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teacherUserId, assignments])

  return (
    <DashboardLayout title="My Timetable">
      <div className="space-y-6">
        <TimetableTermFilters
          term={term}
          academicYear={academicYear}
          onTermChange={setTerm}
          onAcademicYearChange={setAcademicYear}
          loading={loading}
        />
        <TeacherWorkloadSummary summaries={summaries} />
        <TeacherTimetableView
          assignments={assignments}
          timeSlots={timeSlots}
          teacherId={teacherUserId}
          classes={classes}
          subjects={subjects}
          classrooms={classrooms}
          term={term}
          academicYear={academicYear}
        />
      </div>
    </DashboardLayout>
  )
}
