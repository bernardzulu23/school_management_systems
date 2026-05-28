'use client'

/**
 * Subscription expiry warnings for staff dashboards (not shown to students).
 */
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import { getDaysUntilExpiry } from '@/lib/billing/subscription'

const STUDENT_ROLES = new Set(['student', 'STUDENT'])

export function SubscriptionWarningBanner() {
  const { user } = useAuth()
  const { school } = useSchool()
  const role = String(user?.role || '').toLowerCase()

  if (STUDENT_ROLES.has(role)) return null

  const days = getDaysUntilExpiry(school)
  if (days === null || days > 7) return null

  if (days === 0) {
    return (
      <div className="rounded-xl border-2 border-red-500/50 bg-red-50 dark:bg-red-950/30 p-4 mb-4">
        <p className="font-bold text-red-800 dark:text-red-200">Subscription expired</p>
        <p className="text-sm text-red-700/90 dark:text-red-200/80 mt-1">
          Renew to maintain access for teachers and admins. Students are not billed directly.
        </p>
        <Link
          href="/dashboard/billing"
          className="inline-block mt-3 text-sm font-bold text-red-800 underline"
        >
          Renew now →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4 mb-4">
      <p className="font-semibold text-amber-900 dark:text-amber-100">
        Your subscription expires in {days} day{days === 1 ? '' : 's'}
      </p>
      <Link
        href="/dashboard/billing"
        className="text-sm font-bold text-amber-800 underline mt-2 inline-block"
      >
        View billing →
      </Link>
    </div>
  )
}
