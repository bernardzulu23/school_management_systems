'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { sessionFetch } from '@/lib/auth/sessionFetch'

export default function SeniorTeacherMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await sessionFetch('/api/dashboard/senior-teacher', {
          credentials: 'include',
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!active) return
        setTeachers(res.ok && json?.success ? json.data?.teachers || [] : [])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <DashboardLayout title="Teacher Monitoring">
      <Card className="bg-royalPurple-card border border-royalPurple-border2">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1">Primary teacher coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-royalPurple-text2">Loading teacher coverage...</p>
          ) : teachers.length === 0 ? (
            <p className="text-sm text-royalPurple-text2">No primary teacher data found.</p>
          ) : (
            teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="rounded-xl border border-royalPurple-border bg-royalPurple-card2 p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-royalPurple-text1">{teacher.name}</p>
                    <p className="text-sm text-royalPurple-text2">
                      {teacher.classes.join(', ') || 'No classes'} |{' '}
                      {teacher.subjects.join(', ') || 'No subjects'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-royalPurple-muted/60 text-royalPurple-text1">
                      {teacher.totalStudents} students
                    </span>
                    <span className="px-2 py-1 rounded-full bg-royalPurple-muted/60 text-royalPurple-text1">
                      {teacher.allocationCount} allocations
                    </span>
                    <span className="px-2 py-1 rounded-full bg-royalPurple-muted/60 text-royalPurple-text1">
                      {teacher.pendingLessonPlans} lesson plans pending
                    </span>
                    <span className="px-2 py-1 rounded-full bg-royalPurple-muted/60 text-royalPurple-text1">
                      {teacher.pendingAssessments} quizzes pending
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
