'use client'

import { useAuth } from '@/lib/auth'
import PrivacyDashboard from '@/components/privacy/PrivacyDashboard'

export default function PrivacyPage() {
  const { user: currentUser, isAuthenticated } = useAuth()

  // Show loading if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royalPurple-border2 mx-auto mb-4"></div>
          <p className="text-royalPurple-text2 text-lg">Loading privacy dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-royalPurple-page">
      <div className="p-6">
        <PrivacyDashboard />
      </div>
    </div>
  )
}
