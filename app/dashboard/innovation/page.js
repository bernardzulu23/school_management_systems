'use client'

import { useAuth } from '@/lib/auth'
import { isEnabled } from '@/lib/featureFlags'
import { ComingSoon } from '@/components/ui/ComingSoon'
import InnovationHub from '@/components/innovation/InnovationHub'
import LoadingSpinner from '@/components/LoadingSpinner'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

export default function InnovationPage() {
  const { user: currentUser, isAuthenticated } = useAuth()

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--rp-page)]">
        <div className="text-center space-y-4">
          <LoadingSpinner size="xl" color="primary" label="Loading Innovation Hub" />
        </div>
      </div>
    )
  }

  if (!isEnabled('INNOVATION_HUB')) {
    return (
      <DashboardLayout title="Innovation Hub">
        <ComingSoon featureName="Innovation Hub" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Innovation Hub">
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <InnovationHub />
      </div>
    </DashboardLayout>
  )
}
