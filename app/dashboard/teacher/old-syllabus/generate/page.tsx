'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { OldSyllabusHub } from '@/components/old-syllabus/OldSyllabusHub'
import { SecondaryOnlyRouteGuard } from '@/components/auth/SecondaryOnlyRouteGuard'

function OldSyllabusGenerateInner() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const search = useSearchParams()
  const subject = String(search.get('subject') || '')
  const grade = Number(search.get('grade') || 10)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) router.replace('/login')
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
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
