'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { PublishedAscWallTimetable } from '@/components/timetable/PublishedAscWallTimetable'
import { TeacherWorkloadSummary } from '@/components/timetable/TeacherWorkloadSummary'
import { TimetableTermFilters } from '@/components/timetable/TimetableTermFilters'
import { usePublishedTimetableView } from '@/lib/timetable/usePublishedTimetableView'
import { filterClassesInUse, inferClassGrade } from '@/lib/timetable/activeClasses'

export default function HodDepartmentTimetablePage() {
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])

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
  } = usePublishedTimetableView()

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [teachersRes, classesRes] = await Promise.all([
          fetch('/api/users?role=teacher&scope=department', {
            cache: 'no-store',
            credentials: 'include',
          }),
          fetch('/api/classes?limit=200', { cache: 'no-store', credentials: 'include' }),
        ])
        const teachersJson = await teachersRes.json().catch(() => ({}))
        const classesJson = await classesRes.json().catch(() => ({}))
        if (cancelled) return

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

        const cList = Array.isArray(classesJson?.data) ? classesJson.data : []
        const mappedClasses = cList.map((c) => ({
          id: c.id,
          name: c.name || 'Class',
          grade: inferClassGrade(c.name || 'Class', c.yearGroup || c.year_group),
          students: Number(c.studentCount || 40),
          subjects: [],
        }))
        setClasses(filterClassesInUse(mappedClasses, { assignments }))
      } catch (e) {
        toast.error(e?.message || 'Failed to load department teachers')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assignments])

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
        <PublishedAscWallTimetable
          assignments={assignments}
          timeSlots={timeSlots}
          classes={classes}
          teachers={teachers}
        />
      </div>
    </DashboardLayout>
  )
}
