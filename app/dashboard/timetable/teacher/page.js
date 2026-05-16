'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { TeacherTimetableView } from '@/components/timetable/TeacherTimetableView'
import { TeacherWorkloadSummary } from '@/components/timetable/TeacherWorkloadSummary'
import { useAuth } from '@/lib/auth'

export default function TeacherTimetablePage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [assignments, setAssignments] = useState([])
  const [summaries, setSummaries] = useState([])
  const [term] = useState('Term 1')
  const [academicYear] = useState(String(new Date().getFullYear()))

  const teacherUserId = user?.id ? String(user.id) : undefined

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
        setSummaries(Array.isArray(viewJson.teacherSummaries) ? viewJson.teacherSummaries : [])

        const classesJson = await classesRes.json().catch(() => ({}))
        const subjectsJson = await subjectsRes.json().catch(() => ({}))

        const list = Array.isArray(classesJson?.data) ? classesJson.data : []
        setClasses(
          list.map((c) => ({
            id: c.id,
            name: c.name || c.className || 'Class',
            grade: Number(String(c.yearGroup || c.year_group || '').match(/\d+/)?.[0] || 8),
            students: Number(c.studentCount || 40),
            subjects: [],
          }))
        )

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
      }
    }
    if (teacherUserId) load()
  }, [teacherUserId, term, academicYear])

  return (
    <DashboardLayout title="My Timetable">
      <div className="space-y-6">
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
