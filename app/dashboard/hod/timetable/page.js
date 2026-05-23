'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { DepartmentTimetableView } from '@/components/timetable/DepartmentTimetableView'
import { TeacherWorkloadSummary } from '@/components/timetable/TeacherWorkloadSummary'
import { TimetableTermFilters } from '@/components/timetable/TimetableTermFilters'
import { getDefaultAcademicYear, getDefaultTerm } from '@/lib/timetable/timetableTermOptions'

export default function HodDepartmentTimetablePage() {
  const [timeSlots, setTimeSlots] = useState([])
  const [assignments, setAssignments] = useState([])
  const [summaries, setSummaries] = useState([])
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [term, setTerm] = useState(getDefaultTerm)
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ term, academicYear, status: 'published' })
        const [viewRes, teachersRes, classesRes] = await Promise.all([
          fetch(`/api/timetable/view?${qs}`, { cache: 'no-store' }),
          fetch('/api/users?role=teacher&scope=department', { cache: 'no-store' }),
          fetch('/api/classes?limit=200', { cache: 'no-store' }),
        ])

        const viewJson = await viewRes.json().catch(() => ({}))
        if (!viewRes.ok) throw new Error(viewJson?.error || 'Failed to load department timetable')

        setAssignments(Array.isArray(viewJson.assignments) ? viewJson.assignments : [])
        setTimeSlots(Array.isArray(viewJson.timeSlots) ? viewJson.timeSlots : [])
        setSummaries(Array.isArray(viewJson.teacherSummaries) ? viewJson.teacherSummaries : [])

        const teachersJson = await teachersRes.json().catch(() => ({}))
        const tList = Array.isArray(teachersJson?.data) ? teachersJson.data : []
        setTeachers(
          tList.map((u) => ({
            id: String(u.id),
            fullName: u.name || 'Teacher',
            subjects: [],
            availability: [],
            maxHours: { perWeek: 25 },
            traveling: { enabled: false, schools: [] },
          }))
        )

        const classesJson = await classesRes.json().catch(() => ({}))
        const cList = Array.isArray(classesJson?.data) ? classesJson.data : []
        setClasses(
          cList.map((c) => ({
            id: c.id,
            name: c.name || 'Class',
            grade: 8,
            students: 40,
            subjects: [],
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
  }, [term, academicYear])

  const departmentTeacherIds = useMemo(
    () => teachers.map((t) => String(t.id)).filter(Boolean),
    [teachers]
  )

  return (
    <DashboardLayout title="Department Timetable">
      <div className="space-y-6">
        <TimetableTermFilters
          term={term}
          academicYear={academicYear}
          onTermChange={setTerm}
          onAcademicYearChange={setAcademicYear}
          loading={loading}
        />
        <TeacherWorkloadSummary
          summaries={summaries}
          title="Department teachers — subjects & classes"
        />
        <DepartmentTimetableView
          assignments={assignments}
          timeSlots={timeSlots}
          departmentTeacherIds={departmentTeacherIds}
          teachers={teachers}
          classes={classes}
        />
      </div>
    </DashboardLayout>
  )
}
