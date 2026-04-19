'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { DepartmentTimetableView } from '@/components/timetable/DepartmentTimetableView'
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

export default function HodTimetablePage() {
  const { user } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const timeSlots = useMemo(() => genTimeSlots(), [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/teachers?limit=300', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        const list = Array.isArray(json?.data) ? json.data : []
        const mapped = list.map((t) => ({
          id: t.id,
          fullName: t?.user?.name || t?.name || 'Teacher',
          subjects: [],
          availability: [],
          maxHours: {},
          traveling: { enabled: false, schools: [] },
          department: t.department || t?.user?.department,
        }))
        setTeachers(mapped)
        setClassrooms(defaultClassrooms(mapped.length))
      } catch (e) {
        toast.error('Failed to load timetable metadata')
      }
    }
    load()
  }, [])

  const department = String(user?.department || user?.hodProfile?.department || '').trim()
  const departmentTeacherIds = useMemo(() => {
    if (!department) return []
    return teachers
      .filter((t) => String(t.department || '').toLowerCase() === department.toLowerCase())
      .map((t) => String(t.id))
  }, [teachers, department])

  return (
    <DashboardLayout title="Department Timetable">
      <DepartmentTimetableView
        timeSlots={timeSlots}
        departmentTeacherIds={departmentTeacherIds}
        teachers={teachers}
        classrooms={classrooms}
      />
    </DashboardLayout>
  )
}
