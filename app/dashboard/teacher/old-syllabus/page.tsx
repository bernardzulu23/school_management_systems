'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { OldSyllabusHub } from '@/components/old-syllabus/OldSyllabusHub'
import { SecondaryOnlyRouteGuard } from '@/components/auth/SecondaryOnlyRouteGuard'

export default function OldSyllabusLandingPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) {
      router.replace('/login')
      return
    }
    const role = String(user.role || '').toLowerCase()
    if (!['teacher', 'headteacher', 'hod', 'admin'].includes(role)) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading || !user) {
    return (
      <DashboardLayout title="Old Syllabus Studio">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Old Syllabus Studio">
      <SecondaryOnlyRouteGuard redirectTo="/dashboard/teacher/teaching-studio">
        <OldSyllabusHub teacherId={String(user.id)} initialTab="browse" />
      </SecondaryOnlyRouteGuard>
    </DashboardLayout>
  )
}
