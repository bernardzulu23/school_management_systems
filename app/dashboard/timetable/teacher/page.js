'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { TeacherTimetableView } from '@/components/timetable/TeacherTimetableView'
import { TeacherWorkloadSummary } from '@/components/timetable/TeacherWorkloadSummary'
import { TimetableTermFilters } from '@/components/timetable/TimetableTermFilters'
import { useAuth } from '@/lib/auth'
import { getDefaultAcademicYear, getDefaultTerm } from '@/lib/timetable/timetableTermOptions'
import { filterClassesInUse, inferClassGrade } from '@/lib/timetable/activeClasses'

export default function TeacherTimetablePage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [assignments, setAssignments] = useState([])
  const [summaries, setSummaries] = useState([])
  const [term, setTerm] = useState(getDefaultTerm)
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear)
  const [loading, setLoading] = useState(true)

  const teacherUserId = user?.id ? String(user.id) : undefined

  useEffect(() => {
    const load = async () => {
      if (!teacherUserId) return
      setLoading(true)
      try {
        const qs = new URLSearchParams({ term, academicYear, status: 'published' })
        const [viewRes, classesRes, subjectsRes] = await Promise.all([
          fetch(`/api/timetable/view?${qs}`, { cache: 'no-store', credentials: 'include' }),
          fetch('/api/classes?limit=200', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/subjects?limit=200', { cache: 'no-store', credentials: 'include' }),
        ])

        const viewJson = await viewRes.json().catch(() => ({}))
        if (!viewRes.ok)
          throw new Error(viewJson?.message || viewJson?.error || 'Failed to load timetable')

        const loadedAssignments = Array.isArray(viewJson.assignments) ? viewJson.assignments : []
        setAssignments(loadedAssignments)
        setTimeSlots(Array.isArray(viewJson.timeSlots) ? viewJson.timeSlots : [])
        setSummaries(Array.isArray(viewJson.teacherSummaries) ? viewJson.teacherSummaries : [])

        const classesJson = await classesRes.json().catch(() => ({}))
        const subjectsJson = await subjectsRes.json().catch(() => ({}))

        const list = Array.isArray(classesJson?.data) ? classesJson.data : []
        const mappedClasses = list.map((c) => ({
          id: c.id,
          name: c.name || c.className || 'Class',
          grade: inferClassGrade(c.name || c.className || 'Class', c.yearGroup || c.year_group),
          students: Number(c.studentCount || 40),
          subjects: [],
        }))
        setClasses(filterClassesInUse(mappedClasses, { assignments: loadedAssignments }))

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
      } catch (e) {
        toast.error(e?.message || 'Failed to load timetable')
        setAssignments([])
        setTimeSlots([])
        setSummaries([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [teacherUserId, term, academicYear])

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
        />
      </div>
    </DashboardLayout>
  )
}
