/**
 * Affiliated = onboarded tenant (active + verified).
 * Paid = subscription currently valid (paid plan or active trial).
 */

export function isAffiliatedSchool(school) {
  return Boolean(school?.active && school?.emailVerified)
}

export function isPaidSchool(school) {
  if (!isAffiliatedSchool(school)) return false

  const now = new Date()
  const plan = String(school.plan || 'trial')
    .trim()
    .toLowerCase()

  if (plan === 'trial') {
    return Boolean(school.trialEndsAt && new Date(school.trialEndsAt) > now)
  }

  if (['basic', 'standard', 'premium'].includes(plan)) {
    if (!school.planExpiresAt) return true
    return new Date(school.planExpiresAt) > now
  }

  return false
}

/** Schools the platform super admin may list (affiliated + paid). */
export function isAffiliatedPaidSchool(school) {
  return isAffiliatedSchool(school) && isPaidSchool(school)
}

export function subscriptionStatusLabel(school) {
  if (!isAffiliatedSchool(school)) return 'not_affiliated'
  if (!isPaidSchool(school)) return 'expired'
  const plan = String(school.plan || 'trial').toLowerCase()
  return plan === 'trial' ? 'trial' : 'active'
}

/** Metadata-only shape — no student/teacher PII or academic records. */
export function toPlatformSchoolSummary(school, counts = {}) {
  return {
    id: school.id,
    name: school.name,
    subdomain: school.subdomain,
    plan: school.plan,
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
