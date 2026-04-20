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

import { useTimetableStore } from '@/lib/timetable/timetableStore'

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function buildTimeSlots(config) {
  if (!config) return []
  const startMin = timeToMin(config.startTime || '07:00')
  const endMin = timeToMin(config.endTime || '17:00')
  const singleMin = config.singleDuration || 40
  const breakSlots = Array.isArray(config.breakSlots)
    ? config.breakSlots
    : JSON.parse(config.breakSlots || '[]')
  const workingDays = config.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  const out = []
  for (const day of workingDays) {
    let cursor = startMin
    let periodNum = 1
    while (cursor < endMin) {
      const inBreak = breakSlots.find(
        (b) => timeToMin(b.start) <= cursor && timeToMin(b.end) > cursor
      )
      if (inBreak) {
        out.push({
          id: `${day.toLowerCase()}-break-${cursor}`,
          dayOfWeek: day.toLowerCase(),
          startTime: inBreak.start,
          endTime: inBreak.end,
          period: 0,
          isBreak: true,
          label: inBreak.label,
        })
        cursor = timeToMin(inBreak.end)
        continue
      }
      const nextBreak = breakSlots.find((b) => timeToMin(b.start) > cursor)
      const ceilMin = nextBreak ? Math.min(endMin, timeToMin(nextBreak.start)) : endMin

      if (cursor + singleMin <= ceilMin) {
        out.push({
          id: `${day.toLowerCase()}-${periodNum}`,
          dayOfWeek: day.toLowerCase(),
          startTime: minToTime(cursor),
          endTime: minToTime(cursor + singleMin),
          period: periodNum,
          isBreak: false,
          label: `Period ${periodNum}`,
        })
        cursor += singleMin
        periodNum++
      } else {
        cursor = nextBreak ? timeToMin(nextBreak.start) : endMin
      }
    }
  }
  return out
}

export default function StudentTimetablePage() {
  const { user } = useAuth()
  const loadFromApi = useTimetableStore((s) => s.loadFromApi)
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const classId = user?.studentProfile?.classId ? String(user.studentProfile.classId) : undefined

  useEffect(() => {
    const load = async () => {
      try {
        const [classesRes, teachersRes, subjectsRes, configRes] = await Promise.all([
          fetch('/api/classes?limit=200', { cache: 'no-store' }),
          fetch('/api/teachers?limit=200', { cache: 'no-store' }),
          fetch('/api/subjects?limit=200', { cache: 'no-store' }),
          fetch('/api/timetable/generate', { cache: 'no-store' }),
        ])
        const classesJson = await classesRes.json().catch(() => ({}))
        const teachersJson = await teachersRes.json().catch(() => ({}))
        const subjectsJson = await subjectsRes.json().catch(() => ({}))
        const configJson = await configRes.json().catch(() => ({}))

        if (configJson.config) {
          setTimeSlots(buildTimeSlots(configJson.config))
        }

        const cList = Array.isArray(classesJson?.data) ? classesJson.data : []
        const mappedClasses = cList.map((c) => ({
          id: c.id,
          name: c.name || c.className || 'Class',
          grade: Number(String(c.yearGroup || c.year_group || '').match(/\d+/)?.[0] || 8),
          students: Number(c.studentCount || 40),
          subjects: [],
        }))
        setClasses(mappedClasses)

        const sList = Array.isArray(subjectsJson?.subjects) ? subjectsJson.subjects : []
        setSubjects(sList.map((s) => ({ id: s.id, name: s.name })))

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

        // Load assignments from v2 API
        await loadFromApi()
      } catch (e) {
        toast.error('Failed to load timetable metadata')
      }
    }
    load()
  }, [loadFromApi])

  return (
    <DashboardLayout title="My Timetable">
      <StudentTimetableView
        timeSlots={timeSlots}
        classId={classId}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        classrooms={classrooms}
      />
    </DashboardLayout>
  )
}
