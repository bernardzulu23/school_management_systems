'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth, useAuthHasHydrated } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { OldSyllabusHub } from '@/components/old-syllabus/OldSyllabusHub'
import { SecondaryOnlyRouteGuard } from '@/components/auth/SecondaryOnlyRouteGuard'
import { canAccessTeachingStudio } from '@/lib/teaching/teachingStudioAccess'

export default function OldSyllabusSubjectGradePage() {
  const params = useParams()
  const subject = decodeURIComponent(String(params?.subject || ''))
  const grade = Number(params?.grade) || 10
  const user = useAuth((s) => s.user)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const hydrated = useAuthHasHydrated()
  const router = useRouter()

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated || !user) return
    if (!canAccessTeachingStudio(user)) {
      router.replace('/dashboard')
    }
  }, [hydrated, isAuthenticated, user, router])

  if (!hydrated || !user) {
    return (
      <DashboardLayout title="Old Syllabus Studio">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    )
  }

  if (!canAccessTeachingStudio(user)) {
    return (
      <DashboardLayout title="Old Syllabus Studio">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Old Syllabus Studio">
      <SecondaryOnlyRouteGuard redirectTo="/dashboard/teacher/teaching-studio">
        <OldSyllabusHub
          teacherId={String(user.id)}
          initialTab="topics"
          initialSubject={subject}
          initialGrade={grade}
        />
      </SecondaryOnlyRouteGuard>
    </DashboardLayout>
  )
}
