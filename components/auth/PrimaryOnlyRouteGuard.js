'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSchool } from '@/lib/context/SchoolContext'
import { hasPrimaryClasses } from '@/lib/school/schoolTypeHelpers'
import { toast } from 'react-hot-toast'

/**
 * Blocks secondary-only schools from primary-only teacher/admin pages.
 */
export function PrimaryOnlyRouteGuard({
  children,
  redirectTo = '/dashboard/teacher',
  message = 'This area is only available for primary schools.',
}) {
  const { school, isLoading } = useSchool()
  const router = useRouter()
  const allowed = hasPrimaryClasses(school)

  useEffect(() => {
    if (isLoading || !school?.level) return
    if (allowed) return
    toast.error(message)
    router.replace(redirectTo)
  }, [allowed, isLoading, message, redirectTo, router, school?.level])

  if (isLoading || !school?.level) {
    return <p className="text-sm text-muted-foreground p-6">Loading school settings…</p>
  }

  if (!allowed) {
    return <p className="text-sm text-muted-foreground p-6">Redirecting…</p>
  }

  return children
}
