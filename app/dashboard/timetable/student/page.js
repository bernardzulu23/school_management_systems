'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StudentTimetableView } from '@/components/timetable/StudentTimetableView'
import { useAuth } from '@/lib/auth'

export default function StudentTimetablePage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [assignments, setAssignments] = useState([])
  const [term] = useState('Term 1')
  const [academicYear] = useState(String(new Date().getFullYear()))

  const classId = user?.studentProfile?.classId ? String(user.studentProfile.classId) : undefined

  useEffect(() => {
    const load = async () => {
      try {
        const qs = new URLSearchParams({ term, academicYear, status: 'published' })
        const [viewRes, classesRes, subjectsRes] = await Promise.all([
          fetch(`/api/timetable/view?${qs}`, { cache: 'no-store' }),
          fetch('/api/classes?limit=200', { cache: 'no-store' }),
          fetch('/api/subjects?limit=200', { cache: 'no-store' }),
        ])

        const viewJson = await viewRes.json().catch(() => ({}))
        if (!viewRes.ok) throw new Error(viewJson?.error || 'Failed to load timetable')

        setAssignments(Array.isArray(viewJson.assignments) ? viewJson.assignments : [])
        setTimeSlots(Array.isArray(viewJson.timeSlots) ? viewJson.timeSlots : [])

        const classesJson = await classesRes.json().catch(() => ({}))
        const subjectsJson = await subjectsRes.json().catch(() => ({}))

        const cList = Array.isArray(classesJson?.data) ? classesJson.data : []
        setClasses(
          cList.map((c) => ({
            id: c.id,
            name: c.name || c.className || 'Class',
            grade: Number(String(c.yearGroup || c.year_group || '').match(/\d+/)?.[0] || 8),
            students: Number(c.studentCount || 40),
            subjects: [],
          }))
        )

        const sList = Array.isArray(subjectsJson?.subjects) ? subjectsJson.subjects : []
        setSubjects(sList.map((s) => ({ id: s.id, name: s.name })))
      } catch (e) {
        toast.error(e?.message || 'Failed to load timetable')
      }
    }
    load()
  }, [term, academicYear])

  return (
    <DashboardLayout title="My Timetable">
      <StudentTimetableView
        assignments={assignments}
        timeSlots={timeSlots}
        classId={classId}
        classes={classes}
        subjects={subjects}
        subjectOnly
      />
    </DashboardLayout>
  )
}
