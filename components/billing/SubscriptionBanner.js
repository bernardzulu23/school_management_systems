'use client'

import Link from 'next/link'
import { useSchool } from '@/lib/context/SchoolContext'

function computeState(school) {
  const plan = String(school?.plan || 'trial')
    .trim()
    .toLowerCase()
  const trialEndsAt = school?.trialEndsAt ? new Date(school.trialEndsAt) : null
  const planExpiresAt = school?.planExpiresAt ? new Date(school.planExpiresAt) : null
  const now = new Date()
  const isTrial = plan === 'trial'
  const expiresAt = isTrial ? trialEndsAt : planExpiresAt
  if (!expiresAt) return { show: false }

  const msLeft = expiresAt.getTime() - now.getTime()
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000))
  const isExpired = msLeft < 0

  return {
    show: isTrial || isExpired,
    isTrial,
    isExpired,
    daysLeft,
    expiresAt,
    plan,
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
          Access is paused until your school completes payment. Expired on{' '}
          {state.expiresAt.toLocaleDateString('en-GB')}.
          {state.isTrial
            ? ' Trials last exactly 30 days — upgrade now to restore full service for admins, teachers, HODs, and students.'
            : ' Renew your plan to restore access for everyone.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Upgrade / Pay now
          </Link>
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
              Trial ends {state.expiresAt.toLocaleDateString('en-GB')}. After 30 days, access stops
              until payment is made.
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className={`text-sm font-bold underline shrink-0 ${urgent ? 'text-amber-800' : 'text-blue-800'}`}
          >
            Upgrade early
          </Link>
        </div>
      </div>
    )
  }

  return null
}
