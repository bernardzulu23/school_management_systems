'use client'

import { useSchool } from '@/lib/context/SchoolContext'
import { getSubscriptionState, TRIAL_MONTHS } from '@/lib/billing/subscription'
import { BillingUpgradeLink } from '@/components/billing/BillingUpgradeLink'

function computeState(school) {
  if (!school) return { show: false }
  const sub = getSubscriptionState(school)
  if (!sub.expiresAt) return { show: false }

  return {
    show: sub.onTrial || sub.expired || (sub.isTrialPlan && !sub.expired),
    isTrial: sub.onTrial || sub.isTrialPlan,
    isExpired: sub.expired,
    daysLeft: sub.daysLeft,
    expiresAt: sub.expiresAt,
    plan: sub.plan,
  }
}

export default function SubscriptionBanner() {
  const { school } = useSchool()
  const state = computeState(school)

  if (!state.show) return null

  if (state.isExpired) {
    return (
      <div className="rounded-xl border-2 border-red-500/50 bg-red-50 dark:bg-red-950/30 p-5 sm:p-6">
        <p className="text-red-800 dark:text-red-200 font-bold text-base">
          {state.isTrial ? 'Your free trial has ended' : 'Your subscription has expired'}
        </p>
        <p className="text-sm text-red-700/90 dark:text-red-200/80 mt-2">
          Access is paused until payment is completed. Expired on{' '}
          {state.expiresAt.toLocaleDateString('en-GB')}.
          {state.isTrial
            ? ` Free trials last ${TRIAL_MONTHS} months — subscribe now to restore access for all roles.`
            : ' Renew your plan to restore access for everyone.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <BillingUpgradeLink className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400">
            Subscribe / Pay now
          </BillingUpgradeLink>
        </div>
      </div>
    )
  }

  if (state.isTrial && typeof state.daysLeft === 'number' && state.daysLeft >= 0) {
    const urgent = state.daysLeft <= 7
    return (
      <div
        className={`rounded-xl border-2 p-4 sm:p-5 ${
          urgent
            ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20'
            : 'border-blue-500/40 bg-blue-50/80 dark:bg-blue-950/20'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p
              className={`text-sm font-bold ${urgent ? 'text-amber-900 dark:text-amber-100' : 'text-blue-900 dark:text-blue-100'}`}
            >
              Free trial — {state.daysLeft} day{state.daysLeft === 1 ? '' : 's'} remaining
            </p>
            <p className="text-xs mt-1 text-muted">
              Trial ends {state.expiresAt.toLocaleDateString('en-GB')}. After {TRIAL_MONTHS} months,
              access stops until you subscribe.
            </p>
          </div>
          <BillingUpgradeLink
            variant="link"
            className={`text-sm font-bold underline shrink-0 ${urgent ? 'text-amber-800' : 'text-blue-800'}`}
          >
            Subscribe early
          </BillingUpgradeLink>
        </div>
      </div>
    )
  }

  return null
}
