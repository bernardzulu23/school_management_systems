'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StudentTimetableView } from '@/components/timetable/StudentTimetableView'
import { TimetableTermFilters } from '@/components/timetable/TimetableTermFilters'
import { useAuth } from '@/lib/auth'
import { usePublishedTimetableView } from '@/lib/timetable/usePublishedTimetableView'
import { inferClassGrade } from '@/lib/timetable/activeClasses'

export default function StudentTimetablePage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const classId = user?.studentProfile?.classId ? String(user.studentProfile.classId) : undefined

  const { term, setTerm, academicYear, setAcademicYear, assignments, timeSlots, loading, error } =
    usePublishedTimetableView({ enabled: Boolean(user) })

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
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

        const cList = Array.isArray(classesJson?.data) ? classesJson.data : []
        setClasses(
          cList.map((c) => ({
            id: c.id,
            name: c.name || c.className || 'Class',
            grade: inferClassGrade(c.name || c.className || 'Class', c.yearGroup || c.year_group),
            students: Number(c.studentCount || 40),
            subjects: [],
          }))
        )

        const sList = Array.isArray(subjectsJson?.subjects) ? subjectsJson.subjects : []
        setSubjects(sList.map((s) => ({ id: s.id, name: s.name })))
      } catch {
        /* labels only */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <DashboardLayout title="My Timetable">
      <div className="space-y-4">
        <TimetableTermFilters
          term={term}
          academicYear={academicYear}
          onTermChange={setTerm}
          onAcademicYearChange={setAcademicYear}
          loading={loading}
        />
        <StudentTimetableView
          assignments={assignments}
          timeSlots={timeSlots}
          classId={classId}
          classes={classes}
          subjects={subjects}
          subjectOnly
        />
      </div>
    </DashboardLayout>
  )
}
