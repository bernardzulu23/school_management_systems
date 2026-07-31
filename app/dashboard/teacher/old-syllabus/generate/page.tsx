'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useAuthHasHydrated } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { OldSyllabusHub } from '@/components/old-syllabus/OldSyllabusHub'
import { SecondaryOnlyRouteGuard } from '@/components/auth/SecondaryOnlyRouteGuard'
import { canAccessTeachingStudio } from '@/lib/teaching/teachingStudioAccess'

function OldSyllabusGenerateInner() {
  const user = useAuth((s) => s.user)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const hydrated = useAuthHasHydrated()
  const router = useRouter()
  const search = useSearchParams()
  const subject = String(search.get('subject') || '')
  const grade = Number(search.get('grade') || 10)

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated || !user) return
    if (!canAccessTeachingStudio(user)) {
      router.replace('/dashboard')
    }
  }, [hydrated, isAuthenticated, user, router])

  if (!hydrated || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!canAccessTeachingStudio(user)) {
    return <p className="text-sm text-muted-foreground">Redirecting…</p>
  }

  return (
    <OldSyllabusHub
      teacherId={String(user.id)}
      initialTab="generate"
      initialSubject={subject}
      initialGrade={grade}
    />
  )
}

export default function OldSyllabusGeneratePage() {
  return (
    <DashboardLayout title="Old Syllabus Studio">
      <SecondaryOnlyRouteGuard redirectTo="/dashboard/teacher/teaching-studio">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <OldSyllabusGenerateInner />
        </Suspense>
      </SecondaryOnlyRouteGuard>
    </DashboardLayout>
  )
}
