'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StudentTimetableView } from '@/components/timetable/StudentTimetableView'
import { TimetableTermFilters } from '@/components/timetable/TimetableTermFilters'
import { useAuth } from '@/lib/auth'
import { getDefaultAcademicYear, getDefaultTerm } from '@/lib/timetable/timetableTermOptions'
import { inferClassGrade } from '@/lib/timetable/activeClasses'

export default function StudentTimetablePage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [assignments, setAssignments] = useState([])
  const [term, setTerm] = useState(getDefaultTerm)
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear)
  const [loading, setLoading] = useState(true)
  const [seasonReady, setSeasonReady] = useState(false)

  const classId = user?.studentProfile?.classId ? String(user.studentProfile.classId) : undefined

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/timetable/active-season', {
          cache: 'no-store',
          credentials: 'include',
        })
        const json = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && Number(json?.total || 0) > 0) {
          if (json.term) setTerm(String(json.term))
          if (json.academicYear) setAcademicYear(String(json.academicYear))
        }
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setSeasonReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!seasonReady) return
    const load = async () => {
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

        setAssignments(Array.isArray(viewJson.assignments) ? viewJson.assignments : [])
        setTimeSlots(Array.isArray(viewJson.timeSlots) ? viewJson.timeSlots : [])

        const classesJson = await classesRes.json().catch(() => ({}))
        const subjectsJson = await subjectsRes.json().catch(() => ({}))

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
      } catch (e) {
        toast.error(e?.message || 'Failed to load timetable')
        setAssignments([])
        setTimeSlots([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [seasonReady, term, academicYear])

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
