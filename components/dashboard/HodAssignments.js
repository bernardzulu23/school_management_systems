'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Building, UserCheck, GraduationCap } from 'lucide-react'

function performanceLabel(score) {
  const n = Number(score)
  if (!Number.isFinite(n) || n <= 0) return 'pending'
  if (n >= 85) return 'outstanding'
  if (n >= 80) return 'excellent'
  if (n >= 70) return 'good'
  return 'needs-improvement'
}

function getStatusColor(status) {
  switch (status) {
    case 'outstanding':
      return 'text-royalPurple-pillTx bg-royalPurple-pill'
    case 'excellent':
      return 'text-royalPurple-successTx bg-royalPurple-success'
    case 'good':
      return 'text-royalPurple-accentTx bg-royalPurple-accent'
    case 'needs-improvement':
      return 'text-royalPurple-dangerTx bg-royalPurple-danger'
    default:
      return 'text-royalPurple-text2 bg-royalPurple-card2'
  }
}

function getGradeColor(grade) {
  if (grade == null || !Number.isFinite(Number(grade))) return 'text-royalPurple-text2'
  if (grade >= 85) return 'text-royalPurple-pillTx'
  if (grade >= 80) return 'text-royalPurple-successTx'
  if (grade >= 70) return 'text-royalPurple-accentTx'
  if (grade >= 60) return 'text-royalPurple-accentTx'
  return 'text-royalPurple-dangerTx'
}

export default function HodAssignments({ hodData }) {
  const payload = useMemo(() => hodData?.data || hodData || {}, [hodData])
  const stats = payload.stats || {}
  const departmentName = String(payload.department?.name || 'Department')

  const departmentSubjects = useMemo(() => {
    const subjects = Array.isArray(payload.subjects) ? payload.subjects : []
    const teachers = Array.isArray(payload.teachers) ? payload.teachers : []
    const students = Array.isArray(payload.students) ? payload.students : []
    const subjectPerformance = Array.isArray(payload.subjectPerformance)
      ? payload.subjectPerformance
      : []
    const perfByName = new Map(
      subjectPerformance.map((s) => [String(s.subject || s.name || '').trim(), s])
    )

    return subjects.map((subject) => {
      const id = String(subject.id || subject.name || '')
      const name = String(subject.name || 'Subject')
      const teacherNames = []
      const classNames = new Set()
      for (const t of teachers) {
        const tName = String(t?.user?.name || '').trim()
        for (const a of t.teachingAssignments || []) {
          if (String(a?.subject?.id || '') !== id && String(a?.subject?.name || '') !== name) {
            continue
          }
          if (tName && !teacherNames.includes(tName)) teacherNames.push(tName)
          if (a?.class?.name) classNames.add(String(a.class.name))
        }
        const assigned = Array.isArray(t.assignedSubjects) ? t.assignedSubjects : []
        if (assigned.some((s) => String(s) === name || String(s) === id) && tName) {
          if (!teacherNames.includes(tName)) teacherNames.push(tName)
        }
      }
      const studentCount = students.filter((s) =>
        Array.isArray(s?.selected_subjects)
          ? s.selected_subjects.some((x) => String(x) === name)
          : false
      ).length
      const perf = perfByName.get(name) || {}
      const averageGrade = Number(perf.average ?? perf.averageScore ?? 0) || 0
      const passRate = Number(perf.passRate ?? 0) || 0
      return {
        id,
        name,
        code: String(subject.code || subject.id || '—'),
        teachers: teacherNames,
        classes: Array.from(classNames),
        totalStudents: studentCount,
        averageGrade,
        passRate,
        status: performanceLabel(averageGrade),
      }
    })
  }, [payload])

  const departmentTeachers = useMemo(() => {
    const teachers = Array.isArray(payload.teachers) ? payload.teachers : []
    const performance = Array.isArray(payload.teacherPerformance) ? payload.teacherPerformance : []
    const perfByUserId = new Map(performance.map((p) => [String(p.userId || ''), p]))

    return teachers.map((t) => {
      const userId = String(t?.user?.id || '')
      const perf = perfByUserId.get(userId) || {}
      const classSet = new Set(Array.isArray(perf.classes) ? perf.classes : [])
      const subjectSet = new Set(Array.isArray(perf.subjects) ? perf.subjects : [])
      for (const a of t.teachingAssignments || []) {
        if (a?.class?.name) classSet.add(String(a.class.name))
        if (a?.subject?.name) subjectSet.add(String(a.subject.name))
      }
      const averageGrade = Number(perf.averageScore || 0) || 0
      return {
        id: String(t.id || userId),
        name: String(t?.user?.name || 'Teacher'),
        experience: t?.yearsOfExperience ? `${t.yearsOfExperience} yrs` : t?.qualification || '—',
        totalStudents: Number(t?._count?.students || 0) || 0,
        averageGrade,
        attendance: null,
        subjects: Array.from(subjectSet),
        classes: Array.from(classSet),
        performance: performanceLabel(averageGrade),
      }
    })
  }, [payload])

  const departmentClasses = useMemo(() => {
    const classes = Array.isArray(payload.classes) ? payload.classes : []
    const students = Array.isArray(payload.students) ? payload.students : []
    return classes.map((classItem) => {
      const name = String(classItem.name || '')
      const studentsCount =
        typeof classItem.students === 'number'
          ? classItem.students
          : typeof classItem.studentCount === 'number'
            ? classItem.studentCount
            : students.filter((s) => String(s?.class || '') === name).length
      const subjects = Array.isArray(classItem.subjects)
        ? classItem.subjects.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean)
        : Array.isArray(classItem.subjectNames)
          ? classItem.subjectNames
          : []
      const averageGrade =
        classItem.averageGrade != null && Number.isFinite(Number(classItem.averageGrade))
          ? Number(classItem.averageGrade)
          : null
      return {
        id: String(classItem.id || name),
        name,
        students: studentsCount,
        subjects,
        classTeacher: String(classItem.classTeacher || '').trim() || 'Unassigned',
        averageGrade,
        performance: performanceLabel(averageGrade),
      }
    })
  }, [payload])

  const overview = {
    name: departmentName,
    totalTeachers: Number(stats.totalTeachers || departmentTeachers.length || 0),
    totalStudents: Number(stats.totalStudents || 0),
    totalSubjects: Number(stats.totalSubjects || departmentSubjects.length || 0),
    averagePerformance: Number(stats.averagePerformance || 0),
  }

  return (
    <div className="space-y-6">
      <Card className="bg-royalPurple-card border border-royalPurple-border2">
        <CardHeader>
          <CardTitle className="flex items-center text-royalPurple-pillTx">
            <Building className="h-6 w-6 mr-2" />
            {overview.name} Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-royalPurple-pillTx">
                {overview.totalTeachers}
              </div>
              <div className="text-sm text-royalPurple-pillTx">Teachers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-royalPurple-pillTx">
                {overview.totalStudents}
              </div>
              <div className="text-sm text-royalPurple-pillTx">Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-royalPurple-pillTx">
                {overview.totalSubjects}
              </div>
              <div className="text-sm text-royalPurple-pillTx">Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-royalPurple-pillTx">
                {departmentClasses.length}
              </div>
              <div className="text-sm text-royalPurple-pillTx">Classes</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-royalPurple-card rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-royalPurple-text2">
                Department Performance
              </span>
              <span className="text-lg font-bold text-royalPurple-pillTx">
                {overview.averagePerformance}%
              </span>
            </div>
            <div className="w-full bg-royalPurple-card2 rounded-full h-3 mt-2">
              <div
                className="bg-royalPurple-accent h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(Math.max(overview.averagePerformance, 0), 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Department Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departmentSubjects.length === 0 ? (
            <p className="text-sm text-royalPurple-text2">No department subjects found yet.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {departmentSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="border border-royalPurple-border rounded-lg p-4 bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-royalPurple-text1">
                        {subject.name}
                      </h3>
                      <p className="text-sm text-royalPurple-text2">Code: {subject.code}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(subject.status)}`}
                    >
                      {String(subject.status).toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Teachers:</span>
                      <span className="font-medium">{subject.teachers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Classes:</span>
                      <span className="font-medium">{subject.classes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Students (selected):</span>
                      <span className="font-medium">{subject.totalStudents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Average Grade:</span>
                      <span className={`font-medium ${getGradeColor(subject.averageGrade)}`}>
                        {subject.averageGrade || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-royalPurple-text2">
                    <strong>Teachers:</strong>{' '}
                    {subject.teachers.length ? subject.teachers.join(', ') : 'None assigned'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            Department Teachers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departmentTeachers.length === 0 ? (
            <p className="text-sm text-royalPurple-text2">No department teachers found yet.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {departmentTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="border border-royalPurple-border rounded-lg p-4 bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-royalPurple-text1">{teacher.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(teacher.performance)}`}
                    >
                      {String(teacher.performance).toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Experience:</span>
                      <span className="font-medium">{teacher.experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Avg. Grade:</span>
                      <span className={`font-medium ${getGradeColor(teacher.averageGrade)}`}>
                        {teacher.averageGrade || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-royalPurple-text2 space-y-1">
                    <div>
                      <strong>Subjects:</strong>{' '}
                      {teacher.subjects.length ? teacher.subjects.join(', ') : 'None'}
                    </div>
                    <div>
                      <strong>Classes:</strong>{' '}
                      {teacher.classes.length ? teacher.classes.join(', ') : 'None'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Department Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departmentClasses.length === 0 ? (
            <p className="text-sm text-royalPurple-text2">
              No department classes found yet. Classes appear here from teaching assignments and
              department enrolments.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {departmentClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="border border-royalPurple-border rounded-lg p-4 bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-royalPurple-text1">
                      {classItem.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(classItem.performance)}`}
                    >
                      {String(classItem.performance).toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Students:</span>
                      <span className="font-medium">{classItem.students}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Class Teacher:</span>
                      <span className="font-medium text-xs text-right">
                        {classItem.classTeacher}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-royalPurple-text2">Avg. Grade:</span>
                      <span className={`font-medium ${getGradeColor(classItem.averageGrade)}`}>
                        {classItem.averageGrade != null ? `${classItem.averageGrade}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-royalPurple-text2">
                    <strong>Subjects:</strong>{' '}
                    {classItem.subjects.length ? classItem.subjects.join(', ') : 'None assigned'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
