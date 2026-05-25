/**
 * Affiliated = onboarded tenant (active + verified).
 * Paid = subscription currently valid (paid plan or active trial).
 */

export function isAffiliatedSchool(school) {
  return Boolean(school?.active && school?.emailVerified)
}

import { getSubscriptionState } from '@/lib/billing/subscription'

export function isPaidSchool(school) {
  if (!isAffiliatedSchool(school)) return false
  return getSubscriptionState(school).active
}

/** Schools the platform super admin may list (affiliated + paid). */
export function isAffiliatedPaidSchool(school) {
  return isAffiliatedSchool(school) && isPaidSchool(school)
}

/** Plan label for platform UI — trials use premium feature tier. */
export function displayPlanForSchool(school) {
  const plan = String(school.plan || 'trial').toLowerCase()
  if (plan === 'trial' || getSubscriptionState(school).onTrial) return 'premium'
  return plan
}

export function subscriptionStatusLabel(school) {
  if (!isAffiliatedSchool(school)) return 'not_affiliated'
  const sub = getSubscriptionState(school)
  if (sub.expired) return 'expired'
  if (sub.onTrial) return 'trial'
  return 'active'
}

/** Metadata-only shape — no student/teacher PII or academic records. */
export function toPlatformSchoolSummary(school, counts = {}) {
  return {
    id: school.id,
    name: school.name,
    subdomain: school.subdomain,
    plan: displayPlanForSchool(school),
    billingPlan: school.plan,
    level: school.level,
    active: school.active,
    emailVerified: school.emailVerified,
    planExpiresAt: school.planExpiresAt,
    trialEndsAt: school.trialEndsAt,
    createdAt: school.createdAt,
    subscriptionStatus: subscriptionStatusLabel(school),
    counts: {
      users: counts.users ?? 0,
      students: counts.students ?? 0,
      teachers: counts.teachers ?? 0,
    },
  }
}
