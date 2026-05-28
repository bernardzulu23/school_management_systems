'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import MaterialManager from '@/components/materials/MaterialManager'
import LoadingSpinner from '@/components/LoadingSpinner'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'

export default function MaterialsPage() {
  const { user: currentUser, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const role = String(currentUser?.role || '')
      .trim()
      .toLowerCase()
    if (!isAuthenticated || !currentUser) return
    if (role === 'student') {
      router.replace('/dashboard/student/materials')
      return
    }
    if (['teacher', 'hod', 'headteacher', 'admin', 'administrator', 'superadmin'].includes(role)) {
      router.replace('/dashboard/teacher/materials')
    }
  }, [currentUser, isAuthenticated, router])

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
    <DashboardLayout title="Materials">
      <div className="p-6">
        <MaterialManager />
      </div>
    </DashboardLayout>
  )
}
