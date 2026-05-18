'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthHasHydrated } from '@/lib/auth'

/** Legacy route — redirect to role-specific timetable (real API data). */
export default function TimetablePage() {
  const router = useRouter()
  const hydrated = useAuthHasHydrated()
  const user = useAuth((s) => s.user)

  useEffect(() => {
    if (!hydrated) return
    const role = String(user?.role || '').toLowerCase()
    if (role === 'student') {
      router.replace('/dashboard/timetable/student')
      return
    }
    if (role === 'teacher') {
      router.replace('/dashboard/timetable/teacher')
      return
    }
    if (role === 'hod' || role === 'head of department') {
      router.replace('/dashboard/hod/timetable')
      return
    }
    if (['headteacher', 'admin', 'administrator', 'superadmin'].includes(role)) {
      router.replace('/dashboard/headteacher/timetable')
      return
    }
    router.replace('/dashboard')
  }, [user, hydrated, router])

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-ink/60 text-sm">
      Redirecting to your timetable…
    </div>
  )
}
