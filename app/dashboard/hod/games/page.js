'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import GameManagement from '@/components/games/GameManagement'

export default function HODGamesPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subjects', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
        setSubjects(
          rows.map((s) => ({ id: s.id || s.name, name: s.name || String(s) })).filter((s) => s.name)
        )
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
      <GameManagement userRole="hod" subjects={subjects} />
    </DashboardLayout>
  )
}
