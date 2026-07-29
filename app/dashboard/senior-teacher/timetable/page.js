'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { sessionFetch } from '@/lib/auth/sessionFetch'

export default function SeniorTeacherTimetablePage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await sessionFetch('/api/timetable/view', {
          credentials: 'include',
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!active) return
        setEntries(Array.isArray(json?.assignments) ? json.assignments : [])
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
    <DashboardLayout title="Primary Timetable">
      <Card className="bg-royalPurple-card border border-royalPurple-border2">
        <CardHeader>
          <CardTitle className="text-royalPurple-text1">Published primary timetable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-royalPurple-text2">Loading timetable...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-royalPurple-text2">No primary timetable entries found.</p>
          ) : (
            entries.map((entry, index) => (
              <div
                key={`${entry.teacherId || 'teacher'}-${entry.classId || 'class'}-${entry.dayOfWeek || index}-${entry.periodNumber || index}`}
                className="rounded-xl border border-royalPurple-border bg-royalPurple-card2 p-4"
              >
                <p className="font-semibold text-royalPurple-text1">
                  {entry.className || 'Class'} · {entry.subjectName || 'Subject'}
                </p>
                <p className="text-sm text-royalPurple-text2">
                  {entry.dayOfWeek || 'Day'} · Period {entry.periodNumber || '-'} ·{' '}
                  {entry.teacherName || 'Teacher'}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
