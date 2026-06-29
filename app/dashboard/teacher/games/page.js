'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import GameManagement from '@/components/games/GameManagement'

export default function TeacherGamesPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/teaching-assignments', { credentials: 'include' })
      .then((r) => r.json())
      .then(async (json) => {
        const rows = Array.isArray(json?.data) ? json.data : []
        let names = [...new Set(rows.map((a) => a.subjectName).filter(Boolean))]
        if (!names.length) {
          const subjectRes = await fetch('/api/subjects', { credentials: 'include' })
          const subjectJson = await subjectRes.json().catch(() => ({}))
          const subjectRows = Array.isArray(subjectJson?.data)
            ? subjectJson.data
            : Array.isArray(subjectJson)
              ? subjectJson
              : []
          names = subjectRows.map((s) => s.name || String(s)).filter(Boolean)
        }
        setSubjects(names.map((name, i) => ({ id: String(i + 1), name })))
      })
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <DashboardLayout title="Game Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-skeleton w-16 h-16 rounded-full mx-auto mb-4"></div>
            <p className="text-royalPurple-text2">Loading game management...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Game Management">
      <GameManagement userRole="teacher" subjects={subjects} />
    </DashboardLayout>
  )
}
