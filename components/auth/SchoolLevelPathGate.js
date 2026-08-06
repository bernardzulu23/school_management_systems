'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSchool } from '@/lib/context/SchoolContext'
import {
  getSchoolLevelPathGate,
  isPrimaryOnlyPath,
  isSecondaryOnlyPath,
} from '@/lib/school/navApplicability'
import { hasPrimaryClasses, hasSecondaryClasses } from '@/lib/school/schoolTypeHelpers'
import { toast } from 'react-hot-toast'

function homeForPath(pathname) {
  if (String(pathname || '').startsWith('/dashboard/student')) return '/dashboard/student'
  if (String(pathname || '').startsWith('/dashboard/parent')) return '/dashboard/parent'
  if (String(pathname || '').startsWith('/dashboard/hod')) return '/dashboard/teacher'
  if (String(pathname || '').startsWith('/dashboard/senior-teacher')) return '/dashboard/teacher'
  if (String(pathname || '').startsWith('/dashboard/headteacher')) return '/dashboard/headteacher'
  return '/dashboard/teacher'
}

/**
 * Deep-link proof: redirects when the current path is level-gated and the
 * registered school level does not allow it.
 */
export function SchoolLevelPathGate({ children }) {
  const { school, isLoading } = useSchool()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !school?.level) return
    const gate = getSchoolLevelPathGate(pathname)
    if (!gate) return

    if (gate === 'secondary' && !hasSecondaryClasses(school)) {
      toast.error('This area is only available for secondary schools.')
      router.replace(homeForPath(pathname))
      return
    }
    if (gate === 'primary' && !hasPrimaryClasses(school)) {
      toast.error('This area is only available for primary schools.')
      router.replace(homeForPath(pathname))
    }
  }, [isLoading, pathname, router, school, school?.level])

  if (!isLoading && school?.level) {
    if (isSecondaryOnlyPath(pathname) && !hasSecondaryClasses(school)) {
      return <p className="text-sm text-muted-foreground p-6">Redirecting…</p>
    }
    if (isPrimaryOnlyPath(pathname) && !hasPrimaryClasses(school)) {
      return <p className="text-sm text-muted-foreground p-6">Redirecting…</p>
    }
  }

  return children
}
