'use client'

/**
 * Subscription expiry warnings for staff dashboards (not shown to students).
 * Skips the fully-expired state — SubscriptionBanner already shows that CTA.
 */
import { useAuth } from '@/lib/auth'
import { useSchool } from '@/lib/context/SchoolContext'
import { getDaysUntilExpiry } from '@/lib/billing/subscription'
import { BillingUpgradeLink } from '@/components/billing/BillingUpgradeLink'

const STUDENT_ROLES = new Set(['student', 'STUDENT'])

export function SubscriptionWarningBanner() {
  const { user } = useAuth()
  const { school } = useSchool()
  const role = String(user?.role || '').toLowerCase()

  if (STUDENT_ROLES.has(role)) return null

  const days = getDaysUntilExpiry(school)
  // Fully expired is handled by SubscriptionBanner (avoid duplicate dead CTAs).
  if (days === null || days > 7 || days === 0) return null

  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4 mb-4">
      <p className="font-semibold text-amber-900 dark:text-amber-100">
        Your subscription expires in {days} day{days === 1 ? '' : 's'}
      </p>
      <BillingUpgradeLink
        variant="link"
        className="text-sm font-bold text-amber-800 underline mt-2 inline-block"
      >
        View billing →
      </BillingUpgradeLink>
    </div>
  )
}
