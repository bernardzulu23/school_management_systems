'use client'

import { useAuth } from '@/lib/auth'
import PrivacyDashboard from '@/components/privacy/PrivacyDashboard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

export default function PrivacyPage() {
  const { user: currentUser, isAuthenticated } = useAuth()

  // Show loading if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-page">
        <div className="text-center space-y-4">
          <LoadingSpinner size="xl" label="Loading privacy dashboard" />
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout title="Privacy">
      <div className="p-6">
        <PrivacyDashboard />
      </div>
    </DashboardLayout>
  )
}
