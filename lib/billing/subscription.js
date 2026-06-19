/** Trial and paid subscription rules — 2-month trial, then subscription required for all roles. */

export const TRIAL_MONTHS = 2
export const TRIAL_DAYS = TRIAL_MONTHS * 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

const PAID_SCHOOL_PLANS = ['basic', 'standard', 'premium']
const PAID_INDIVIDUAL_PLANS = [
  'individual',
  'individual_free',
  'individual_premium',
  'individual_annual',
]

export function trialEndsAtFromStart(start = new Date()) {
  return new Date(new Date(start).getTime() + TRIAL_DAYS * MS_PER_DAY)
}

/**
 * Effective trial end for subscription checks.
 * Legacy schools may have plan=trial but null trialEndsAt — derive from createdAt when present.
 */
export function resolveTrialEndsAt(school) {
  if (school?.trialEndsAt) return new Date(school.trialEndsAt)
  const plan = String(school?.plan || 'trial')
    .trim()
    .toLowerCase()
  if (plan === 'trial' && school?.createdAt) {
    return trialEndsAtFromStart(school.createdAt)
  }
  return null
}

/**
 * Legacy schools registered before trialEndsAt was tracked need a persisted trial end.
 * @returns {Date | null} trial end to write, or null if no backfill needed
 */
export function legacyTrialEndsAtBackfill(school, now = new Date()) {
  const plan = String(school?.plan || 'trial')
    .trim()
    .toLowerCase()
  if (plan !== 'trial' || school?.trialEndsAt) return null
  return trialEndsAtFromStart(now)
}

/**
 * Backfill missing trial/email fields for schools created before subscription tracking.
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {string} schoolId
 * @param {object} school
 */
export async function hydrateLegacySchoolAccess(prismaClient, schoolId, school) {
  const data = {}
  const trialBackfill = legacyTrialEndsAtBackfill(school)
  if (trialBackfill) data.trialEndsAt = trialBackfill
  if (school?.active && !school?.emailVerified) data.emailVerified = true

  if (Object.keys(data).length === 0) return school

  await prismaClient.school.update({
    where: { id: schoolId },
    data,
  })
  return { ...school, ...data }
}

function trialActive(school, now) {
  const trialEndsAt = resolveTrialEndsAt(school)
  return Boolean(trialEndsAt && trialEndsAt.getTime() > now.getTime())
}

function paidPeriodActive(school, now) {
  const planExpiresAt = school?.planExpiresAt ? new Date(school.planExpiresAt) : null
  return Boolean(planExpiresAt && planExpiresAt.getTime() > now.getTime())
}

/**
 * @param {import('@prisma/client').School | null | undefined} school
 */
export function getSubscriptionState(school, now = new Date()) {
  const plan = String(school?.plan || 'trial')
    .trim()
    .toLowerCase()
  const trialEndsAt = resolveTrialEndsAt(school)
  const planExpiresAt = school?.planExpiresAt ? new Date(school.planExpiresAt) : null

  const onTrialPeriod = trialActive(school, now)
  const onPaidPeriod = paidPeriodActive(school, now)
  const isTrialPlan = plan === 'trial'

  let active
  if (plan === 'unpaid') {
    active = false
  } else if (isTrialPlan) {
    active = onTrialPeriod
  } else {
    active = onTrialPeriod || onPaidPeriod
  }

  const expiresAt = isTrialPlan
    ? trialEndsAt
    : onPaidPeriod
      ? planExpiresAt
      : trialEndsAt || planExpiresAt

  const msLeft = expiresAt ? expiresAt.getTime() - now.getTime() : null
  const daysLeft = typeof msLeft === 'number' && msLeft >= 0 ? Math.ceil(msLeft / MS_PER_DAY) : null
  const daysOverdue =
    typeof msLeft === 'number' && msLeft < 0 ? Math.ceil(Math.abs(msLeft) / MS_PER_DAY) : null

  const isTrialExpired = isTrialPlan && !onTrialPeriod
  const isPaidExpired =
    [...PAID_SCHOOL_PLANS, ...PAID_INDIVIDUAL_PLANS].includes(plan) && !active && !onTrialPeriod

  const onTrial = onTrialPeriod && (isTrialPlan || !onPaidPeriod)
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
    trialMonthsTotal: TRIAL_MONTHS,
  }
}

export function isSchoolAccessAllowed(school, now = new Date()) {
  if (!school?.active) return false
  return getSubscriptionState(school, now).active
}

/**
 * Days until subscription/trial expires. null = no expiry date set.
 * @param {import('@prisma/client').School | null | undefined} school
 * @returns {number | null}
 */
export function getDaysUntilExpiry(school, now = new Date()) {
  const sub = getSubscriptionState(school, now)
  if (!sub.expiresAt) return null
  const ms = sub.expiresAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(ms / MS_PER_DAY))
}
