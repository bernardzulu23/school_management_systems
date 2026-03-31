'use client'

import { useAuth } from '@/lib/auth'
import MaterialManager from '@/components/materials/MaterialManager'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function MaterialsPage() {
  const { user: currentUser, isAuthenticated } = useAuth()

  // Show loading if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-royalPurple-page">
        <div className="text-center space-y-4">
          <LoadingSpinner size="xl" label="Loading materials" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-royalPurple-page">
      <div className="p-6">
        <MaterialManager />
      </div>
    </div>
  )
}
