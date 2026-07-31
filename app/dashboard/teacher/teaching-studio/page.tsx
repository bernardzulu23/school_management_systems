'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthHasHydrated } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { TeachingHub } from '@/components/teaching/TeachingHub'
import { canAccessTeachingStudio } from '@/lib/teaching/teachingStudioAccess'

export default function TeachingStudioPage() {
  const user = useAuth((s) => s.user)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const hydrated = useAuthHasHydrated()
  const router = useRouter()

  useEffect(() => {
    // Wait for zustand persist rehydration before any auth redirects.
    // Redirecting earlier logs users out on full-page sidebar navigations.
    if (!hydrated) return
    if (!isAuthenticated || !user) return // ServerSessionGuard handles login redirect
    if (!canAccessTeachingStudio(user)) {
      router.replace('/dashboard')
    }
  }, [hydrated, isAuthenticated, user, router])

  if (!hydrated || !user) {
    return (
      <DashboardLayout title="Teaching Studio">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    )
  }

  if (!canAccessTeachingStudio(user)) {
    return (
      <DashboardLayout title="Teaching Studio">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Teaching Studio">
      <TeachingHub teacherId={String(user.id)} />
    </DashboardLayout>
  )
}
