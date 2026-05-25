/** Trial and paid subscription rules — 30-day trial, strict cutoff. */

export const TRIAL_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function trialEndsAtFromStart(start = new Date()) {
  return new Date(new Date(start).getTime() + TRIAL_DAYS * MS_PER_DAY)
}

/**
 * @param {import('@prisma/client').School | null | undefined} school
 */
export function getSubscriptionState(school, now = new Date()) {
  const plan = String(school?.plan || 'trial')
    .trim()
    .toLowerCase()
  const trialEndsAt = school?.trialEndsAt ? new Date(school.trialEndsAt) : null
  const planExpiresAt = school?.planExpiresAt ? new Date(school.planExpiresAt) : null

  const isTrialPlan = plan === 'trial'
  const expiresAt = isTrialPlan ? trialEndsAt : planExpiresAt
  const msLeft = expiresAt ? expiresAt.getTime() - now.getTime() : null
  const daysLeft = typeof msLeft === 'number' && msLeft >= 0 ? Math.ceil(msLeft / MS_PER_DAY) : null
  const daysOverdue =
    typeof msLeft === 'number' && msLeft < 0 ? Math.ceil(Math.abs(msLeft) / MS_PER_DAY) : null

  const isTrialExpired = isTrialPlan && (!trialEndsAt || trialEndsAt.getTime() <= now.getTime())

  const paidPlanActive =
    ['basic', 'standard', 'premium'].includes(plan) &&
    (Boolean(trialEndsAt && trialEndsAt.getTime() > now.getTime()) ||
      !planExpiresAt ||
      planExpiresAt.getTime() > now.getTime())

  const onTrial = isTrialPlan && Boolean(trialEndsAt && trialEndsAt.getTime() > now.getTime())
  const active = plan === 'unpaid' ? false : isTrialPlan ? onTrial : paidPlanActive

  const isPaidExpired = ['basic', 'standard', 'premium'].includes(plan) && !active && !onTrial

  const expired = !active

  return {
    plan,
    isTrialPlan,
    onTrial,
    active: active && !expired,
    expired,
    isTrialExpired,
    isPaidExpired,
    expiresAt,
    trialEndsAt,
    planExpiresAt,
    daysLeft,
    daysOverdue,
    trialDaysTotal: TRIAL_DAYS,
  }
}

export function isSchoolAccessAllowed(school, now = new Date()) {
  if (!school?.active) return false
  return getSubscriptionState(school, now).active
}
