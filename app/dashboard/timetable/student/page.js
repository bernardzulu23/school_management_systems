'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { StudentTimetableView } from '@/components/timetable/StudentTimetableView'
import { useAuth } from '@/lib/auth'

function genTimeSlots() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
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
  ]
  const out = []
  for (const d of days) {
    for (const p of periods) {
      out.push({
        id: `${d}-${p.period}`,
        dayOfWeek: d,
        startTime: p.start,
        endTime: p.end,
        period: p.period,
        isBreak: p.isBreak,
        label: p.label,
      })
    }
  }
  return out
}

function defaultClassrooms(count) {
  const n = Math.max(8, Math.min(60, count))
  return Array.from({ length: n }).map((_, i) => ({
    id: `room-${i + 1}`,
    name: `Rm${String(101 + i)}`,
    capacity: 50,
    equipment: ['chalkboard'],
    accessibility: ['ground-floor'],
  }))
}

export default function StudentTimetablePage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const timeSlots = useMemo(() => genTimeSlots(), [])
  const classId = user?.studentProfile?.classId ? String(user.studentProfile.classId) : undefined

  useEffect(() => {
    const load = async () => {
      try {
        const [classesRes, teachersRes] = await Promise.all([
          fetch('/api/classes?limit=200', { cache: 'no-store' }),
          fetch('/api/teachers?limit=200', { cache: 'no-store' }),
        ])
        const classesJson = await classesRes.json().catch(() => ({}))
        const teachersJson = await teachersRes.json().catch(() => ({}))

        const cList = Array.isArray(classesJson?.data) ? classesJson.data : []
        const mappedClasses = cList.map((c) => ({
          id: c.id,
          name: c.name || c.className || 'Class',
          grade: Number(String(c.yearGroup || c.year_group || '').match(/\d+/)?.[0] || 8),
          students: Number(c.studentCount || 40),
          subjects: [],
        }))
        setClasses(mappedClasses)
        setClassrooms(defaultClassrooms(mappedClasses.length))

        const tList = Array.isArray(teachersJson?.data) ? teachersJson.data : []
        const mappedTeachers = tList.map((t) => ({
          id: t.id,
          fullName: t?.user?.name || t?.name || 'Teacher',
          subjects: [],
          availability: [],
          maxHours: {},
          traveling: { enabled: false, schools: [] },
        }))
        setTeachers(mappedTeachers)
      } catch (e) {
        toast.error('Failed to load timetable metadata')
      }
    }
    load()
  }, [])

  return (
    <DashboardLayout title="My Timetable">
      <StudentTimetableView
        timeSlots={timeSlots}
        classId={classId}
        classes={classes}
        teachers={teachers}
        classrooms={classrooms}
      />
    </DashboardLayout>
  )
}
