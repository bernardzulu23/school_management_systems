'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import {
  Users,
  Calendar,
  Check,
  X,
  Clock,
  Loader2,
  AlertTriangle,
  Smartphone,
  Monitor,
} from 'lucide-react'
import { SyncStatusBadge } from '@/components/attendance/SyncStatusBadge'
import { attendanceStore } from '@/lib/offline/attendance-store'
import { useOfflineSync } from '@/lib/offline/use-sync'
import { useAuth } from '@/lib/auth'

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [usingCachedRoster, setUsingCachedRoster] = useState(false)
  const [sessionSummary, setSessionSummary] = useState([])
  const [attendanceMeta, setAttendanceMeta] = useState(null)
  const [recordSources, setRecordSources] = useState({})
  const [teachingAssignments, setTeachingAssignments] = useState([])
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { isOnline, refreshPendingCount, syncNow } = useOfflineSync()

  const schoolId = String(user?.schoolId || user?.school_id || '')

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const res = await fetch('/api/teaching-assignments', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        setTeachingAssignments(Array.isArray(json?.data) ? json.data : [])
      } catch {
        setTeachingAssignments([])
      }
    }
    loadAssignments()
  }, [])

  const subjectsForClass = useMemo(() => {
    if (!selectedClass) return []
    const seen = new Map()
    for (const a of teachingAssignments) {
      if (String(a.classId) !== String(selectedClass)) continue
      if (!a.subjectId) continue
      seen.set(String(a.subjectId), a.subjectName || 'Subject')
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [teachingAssignments, selectedClass])

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: dashboardError,
  } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => api.getTeacherDashboard().then((res) => res.data),
  })

  const loadStudents = useCallback(async () => {
    if (!selectedClass) return []
    try {
      const res = await fetch(
        `/api/classes/students?classId=${encodeURIComponent(selectedClass)}`,
        {
          credentials: 'include',
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load students')
      const list = Array.isArray(json?.data) ? json.data : []
      await attendanceStore.cacheRoster(selectedClass, schoolId, list)
      setUsingCachedRoster(false)
      return list
    } catch (err) {
      const cached = await attendanceStore.getCachedRoster(selectedClass)
      if (cached?.students?.length) {
        setUsingCachedRoster(true)
        toast('Showing saved class list (offline)', { icon: '📴' })
        return cached.students
      }
      throw err
    }
  }, [selectedClass, schoolId])

  const {
    data: studentsData,
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: ['class-students', selectedClass],
    enabled: Boolean(selectedClass),
    queryFn: loadStudents,
  })

  const students = useMemo(() => (Array.isArray(studentsData) ? studentsData : []), [studentsData])

  const [attendance, setAttendance] = useState({})

  const { data: savedRecords } = useQuery({
    queryKey: ['attendance-records', selectedClass, selectedDate, selectedSubjectId],
    enabled: Boolean(selectedClass && selectedDate),
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('classId', selectedClass)
      params.set('date', selectedDate)
      if (selectedSubjectId) params.set('subjectId', selectedSubjectId)
      const res = await fetch(`/api/attendance?${params.toString()}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load attendance')
      setSessionSummary(Array.isArray(json?.sessions) ? json.sessions : [])
      setAttendanceMeta(json?.meta || null)
      const sources = {}
      for (const row of json?.data || []) {
        sources[String(row.studentId)] = row.source || 'daily'
      }
      setRecordSources(sources)
      return Array.isArray(json?.data) ? json.data : []
    },
    retry: isOnline ? 1 : 0,
  })

  useEffect(() => {
    if (!selectedClass) return
    if (students.length === 0) {
      setAttendance({})
      return
    }
    const savedMap = new Map(
      (Array.isArray(savedRecords) ? savedRecords : []).map((r) => [
        String(r.studentId),
        String(r.status),
      ])
    )
    setAttendance(() => {
      const next = {}
      for (const s of students) {
        const id = String(s.id)
        next[id] = savedMap.get(id) || 'present'
      }
      return next
    })
  }, [selectedClass, selectedDate, students, savedRecords])

  const handleAttendanceChange = async (studentId, status) => {
    const sid = String(studentId)
    setAttendance((prev) => ({
      ...prev,
      [sid]: status,
    }))

    if (!selectedClass || !selectedDate) return

    await attendanceStore.queueMark({
      studentId: sid,
      classId: selectedClass,
      schoolId,
      date: selectedDate,
      status,
    })
    await refreshPendingCount()
  }

  const attendanceMutation = useMutation({
    mutationFn: async (records) => {
      await attendanceStore.queueBulk({
        classId: selectedClass,
        schoolId,
        date: selectedDate,
        records,
      })

      if (!navigator.onLine) {
        return { offline: true }
      }

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date: selectedDate, records }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to save attendance')
      await syncNow()
      return json
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['teacher-dashboard'])
      queryClient.invalidateQueries(['class-students', selectedClass])
      queryClient.invalidateQueries([
        'attendance-records',
        selectedClass,
        selectedDate,
        selectedSubjectId,
      ])
      refreshPendingCount()
      if (result?.offline) {
        toast.success('Attendance saved on this device — will sync when online')
      } else {
        toast.success('Attendance saved successfully!')
      }
    },
    onError: (error) => {
      refreshPendingCount()
      toast.error(
        error.message ||
          'Could not reach server — your marks are saved locally and will sync when online'
      )
    },
  })

  const handleSaveAttendance = () => {
    if (!selectedClass) return
    const records = students.map((s) => ({
      studentId: s.id,
      status: attendance[String(s.id)] || 'present',
    }))
    attendanceMutation.mutate(records)
  }

  if (dashboardLoading) {
    return (
      <DashboardLayout title="Take Attendance">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-royalPurple-accentTx" />
        </div>
      </DashboardLayout>
    )
  }

  if (dashboardError) {
    return (
      <DashboardLayout title="Take Attendance">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-royalPurple-dangerTx mx-auto mb-4" />
          <p className="text-royalPurple-text2">Failed to load attendance data. Please refresh.</p>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Take Attendance">
      <main className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royalPurple-text1">Take Attendance</h1>
            <p className="text-royalPurple-text2">
              Class register synced with ZSMS Mobile lesson sessions — same school database
            </p>
          </div>
          <SyncStatusBadge />
        </header>

        <section aria-labelledby="selection-title">
          <Card>
            <CardHeader>
              <CardTitle id="selection-title">Select Class and Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="class-select"
                    className="block text-sm font-medium text-royalPurple-text2 mb-2"
                  >
                    Select Class
                  </label>
                  <select
                    id="class-select"
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value)
                      setSelectedSubjectId('')
                    }}
                    className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent outline-none bg-royalPurple-card"
                  >
                    <option value="">Choose a class...</option>
                    {dashboardData?.my_classes?.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.student_count} students)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="subject-select"
                    className="block text-sm font-medium text-royalPurple-text2 mb-2"
                  >
                    Subject (mobile lesson view)
                  </label>
                  <select
                    id="subject-select"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent outline-none bg-royalPurple-card"
                    disabled={!selectedClass || subjectsForClass.length === 0}
                  >
                    <option value="">All — daily register + sessions</option>
                    {subjectsForClass.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="date-select"
                    className="block text-sm font-medium text-royalPurple-text2 mb-2"
                  >
                    Date
                  </label>
                  <input
                    id="date-select"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {selectedClass && sessionSummary.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile lesson sessions on this date
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessionSummary.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-royalPurple-border text-sm"
                >
                  <div>
                    <span className="font-medium text-royalPurple-text1">
                      {s.subjectName || 'Lesson'}
                    </span>
                    {s.periodLabel ? (
                      <span className="text-royalPurple-text3"> · {s.periodLabel}</span>
                    ) : null}
                    <div className="text-royalPurple-text2 text-xs mt-0.5">
                      {s.teacherName || 'Teacher'} · {s.verificationMethod || 'MANUAL'} · {s.status}
                    </div>
                  </div>
                  <div className="text-xs text-royalPurple-text2">
                    P {s.present} · L {s.late} · A {s.absent} · {s.markCount} marked
                  </div>
                </div>
              ))}
              {attendanceMeta ? (
                <p className="text-xs text-royalPurple-text3">
                  {attendanceMeta.sessionCount} session(s), {attendanceMeta.sessionMarkCount} pupil
                  marks merged with {attendanceMeta.dailyCount} daily register row(s).
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {selectedClass && (
          <section
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
            aria-label="Attendance Summary"
          >
            <Card className="focus-within:ring-2 focus-within:ring-g-500 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-royalPurple-accentTx" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-royalPurple-text2">Total Students</p>
                    <p className="text-lg font-semibold">{students.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="focus-within:ring-2 focus-within:ring-kpi-pass/100 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Check className="h-6 w-6 text-royalPurple-successTx" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-royalPurple-text2">Present</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter((status) => status === 'present').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="focus-within:ring-2 focus-within:ring-accent/100 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <X className="h-6 w-6 text-royalPurple-dangerTx" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-royalPurple-text2">Absent</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter((status) => status === 'absent').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="focus-within:ring-2 focus-within:ring-warn/100 transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-warn" aria-hidden="true" />
                  <div className="ml-3">
                    <p className="text-sm text-royalPurple-text2">Late</p>
                    <p className="text-lg font-semibold">
                      {Object.values(attendance).filter((status) => status === 'late').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {selectedClass && (
          <section aria-labelledby="attendance-list-title">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle id="attendance-list-title">Student Attendance</CardTitle>
                  {usingCachedRoster ? (
                    <p className="text-xs text-amber-700 mt-1">Using offline class list</p>
                  ) : null}
                </div>
                <Button
                  onClick={handleSaveAttendance}
                  className="bg-royalPurple-success hover:bg-royalPurple-success focus:ring-2 focus:ring-kpi-pass/100 focus:ring-offset-2 outline-none"
                  aria-label="Save current attendance"
                  disabled={attendanceMutation.isPending}
                >
                  {attendanceMutation.isPending ? 'Saving…' : 'Save Attendance'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" role="list">
                  {studentsLoading ? (
                    <div className="text-royalPurple-text2">Loading students...</div>
                  ) : studentsError && students.length === 0 ? (
                    <div className="text-royalPurple-text2">
                      Could not load students. Connect to the internet or pick a class you opened
                      before while online.
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-royalPurple-text2">No students found for this class.</div>
                  ) : (
                    students.map((student) => (
                      <article
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg focus-within:ring-2 focus-within:ring-g-500 outline-none transition-shadow"
                        role="listitem"
                        tabIndex="0"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-10 h-10 bg-royalPurple-card2 rounded-full flex items-center justify-center"
                            aria-hidden="true"
                          >
                            <span className="text-sm font-medium">
                              {student.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-royalPurple-text1 flex items-center gap-2 flex-wrap">
                              {student.name}
                              {recordSources[String(student.id)] === 'session' ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-royalPurple-accent text-royalPurple-accentTx">
                                  <Smartphone className="h-3 w-3" />
                                  Mobile
                                </span>
                              ) : recordSources[String(student.id)] === 'daily' ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-royalPurple-card2 text-royalPurple-text2">
                                  <Monitor className="h-3 w-3" />
                                  Web
                                </span>
                              ) : null}
                            </p>
                            <p className="text-sm text-royalPurple-text3">
                              {student.exam_number
                                ? `Exam: ${student.exam_number}`
                                : `ID: ${student.student_id}`}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap gap-2 justify-end"
                          role="group"
                          aria-label={`Attendance status for ${student.name}`}
                        >
                          <Button
                            variant={
                              attendance[String(student.id)] === 'present' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            className={`${attendance[String(student.id)] === 'present' ? 'bg-royalPurple-success hover:bg-royalPurple-success' : ''} focus:ring-2 focus:ring-kpi-pass/100`}
                            aria-pressed={attendance[String(student.id)] === 'present'}
                          >
                            <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                            Present
                          </Button>

                          <Button
                            variant={
                              attendance[String(student.id)] === 'absent' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            className={`${attendance[String(student.id)] === 'absent' ? 'bg-royalPurple-danger hover:bg-royalPurple-danger' : ''} focus:ring-2 focus:ring-accent/100`}
                            aria-pressed={attendance[String(student.id)] === 'absent'}
                          >
                            <X className="h-4 w-4 mr-1" aria-hidden="true" />
                            Absent
                          </Button>

                          <Button
                            variant={
                              attendance[String(student.id)] === 'late' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'late')}
                            className={`${attendance[String(student.id)] === 'late' ? 'bg-warn hover:bg-g-700' : ''} focus:ring-2 focus:ring-warn/100`}
                            aria-pressed={attendance[String(student.id)] === 'late'}
                          >
                            <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                            Late
                          </Button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {!selectedClass && (
          <section aria-label="No class selected">
            <Card>
              <CardContent className="text-center py-12">
                <Calendar
                  className="h-12 w-12 text-royalPurple-text3 mx-auto mb-4"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-medium text-royalPurple-text1 mb-2">Select a Class</h3>
                <p className="text-royalPurple-text2">
                  Choose a class from the dropdown above to start taking attendance.
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </DashboardLayout>
  )
}
