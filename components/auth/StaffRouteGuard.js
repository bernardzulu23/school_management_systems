'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { isSchoolStaffRole } from '@/lib/auth/roles'
import { toast } from 'react-hot-toast'

/**
 * Redirects students away from teacher/HOD-only pages (prevents silent 403 / static UI).
 */
export function StaffRouteGuard({ children, message }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const role = user?.role

  useEffect(() => {
    if (!isAuthenticated || !role) return
    if (isSchoolStaffRole(role)) return
    toast.error(
      message ||
        'This page is for teachers and HODs only. Sign in with a teacher account (see docs/doc/credetials.md).'
    )
    router.replace('/dashboard/student')
  }, [isAuthenticated, role, router, message])

  if (isAuthenticated && role && !isSchoolStaffRole(role)) {
    return (
      <p className="text-sm text-royalPurple-text2 p-6">
        Redirecting… This area is for teachers and HODs only.
      </p>
    )
  }

  return children
}
