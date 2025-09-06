'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import GameManagement from '@/components/games/GameManagement'

export default function HODGamesPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Mock subjects data - replace with actual API call
  useEffect(() => {
    setTimeout(() => {
      setSubjects([
        { id: 1, name: 'Mathematics' },
        { id: 2, name: 'English' },
        { id: 3, name: 'Science' },
        { id: 4, name: 'History' },
        { id: 5, name: 'Geography' },
        { id: 6, name: 'Computer Science' },
        { id: 7, name: 'Physics' },
        { id: 8, name: 'Chemistry' },
        { id: 9, name: 'Biology' },
        { id: 10, name: 'Art' }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <DashboardLayout title="Game Management">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="loading-skeleton w-16 h-16 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading game management...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Game Management">
      <GameManagement 
        userRole="hod"
        subjects={subjects}
      />
    </DashboardLayout>
  )
}
