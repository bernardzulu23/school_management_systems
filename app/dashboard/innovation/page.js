'use client'

import { useAuth } from '@/lib/auth'
import InnovationHub from '@/components/innovation/InnovationHub'
import LoadingSpinner from '@/components/LoadingSpinner'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

export default function InnovationPage() {
  const { user: currentUser, isAuthenticated } = useAuth()

  // Show loading if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ink via-g-800 to-g-700">
        <div className="text-center space-y-4">
          <LoadingSpinner size="xl" color="white" label="Loading Innovation Hub" />
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout title="Innovation Hub">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-ink via-g-800 to-g-700">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-accent/20 to-ink/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-g-700/20 to-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-ink/20 to-g-700/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>

        <div className="p-6 relative z-10">
          <InnovationHub />
        </div>
      </div>
    </DashboardLayout>
  )
}
