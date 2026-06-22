/** Monthly subscription prices in ZMW (mobile money). */
export const PLAN_PRICING = {
  basic: 500,
  standard: 800,
  premium: 1200,
  /** Solo teacher workspace — up to 10 students, ECZ tools */
  individual: 50,
  /** @deprecated legacy slug — treated as `individual` */
  individual_free: 50,
  individual_premium: 99,
  individual_annual: 799,
}

export const PLAN_LABELS = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  individual: 'Individual Teacher',
  individual_free: 'Individual Teacher',
  individual_premium: 'Individual Premium',
  individual_annual: 'Individual Premium (Annual)',
}

export const PLAN_DESCRIPTIONS = {
  basic: 'Up to 500 students · Core modules',
  standard: 'Up to 800 students · Analytics + SMS',
  premium: 'Unlimited · All features + priority support',
  individual: 'Solo teacher · Up to 10 students · ECZ tools · 2-month trial · K50/month after',
  individual_free: 'Solo teacher · Up to 10 students · ECZ tools · 2-month trial · K50/month after',
  individual_premium: 'Solo teacher · Unlimited students · AI tools',
  individual_annual: 'Individual Premium billed yearly (K799)',
}

/** Max students per school subscription plan. */
export const SCHOOL_STUDENT_LIMIT = {
  trial: Infinity,
  basic: 500,
  standard: 800,
  premium: Infinity,
}

/** Max students a solo teacher can register per plan. */
export const INDIVIDUAL_STUDENT_LIMIT = {
  individual: 10,
  individual_free: 10,
  individual_premium: Infinity,
  individual_annual: Infinity,
}

/** @deprecated No plan skips subscription — all roles get a 2-month trial then must pay. */
export const FREE_INDIVIDUAL_PLANS = new Set([])

/** Plans that unlock AI generation features. */
export const AI_PLANS = [
  'individual_premium',
  'individual_annual',
  'basic',
  'standard',
  'premium',
  'trial',
]

export const INDIVIDUAL_TEACHER_PLANS = new Set([
  'individual',
  'individual_free',
  'individual_premium',
  'individual_annual',
])

/** Solo teacher plans only — no independent student portal. */
export const INDIVIDUAL_PLANS = new Set([...INDIVIDUAL_TEACHER_PLANS])

export const PAID_INDIVIDUAL_PLAN_SLUGS = [
  'individual',
  'individual_free',
  'individual_premium',
  'individual_annual',
]

export function normalizePlanSlug(plan) {
  const key = String(plan || '').toLowerCase()
  if (key === 'individual_free') return 'individual'
  return key
}

export function getSchoolStudentLimit(plan) {
  const key = normalizePlanSlug(plan)
  const limit = SCHOOL_STUDENT_LIMIT[key]
  if (limit === Infinity) return Infinity
  if (typeof limit === 'number' && limit > 0) return limit
  return SCHOOL_STUDENT_LIMIT.trial
}

export function getPlanMonthlyPrice(plan) {
  const key = normalizePlanSlug(plan)
  if (key === 'individual_annual') {
    return PLAN_PRICING.individual_annual / 12
  }
  return PLAN_PRICING[key] ?? PLAN_PRICING[plan] ?? null
}

export function formatPlanPrice(plan, months = 1) {
  const key = normalizePlanSlug(plan)
  if (key === 'individual_annual') {
    return {
      monthly: PLAN_PRICING.individual_annual / 12,
      months: 12,
      total: PLAN_PRICING.individual_annual,
      label: `K${PLAN_PRICING.individual_annual.toLocaleString('en-ZM')} / year`,
    }
  }
  const monthly = getPlanMonthlyPrice(plan)
  if (monthly == null) return null
  const m = Math.max(1, Number(months) || 1)
  const total = monthly * m
  return {
    monthly,
    months: m,
    total,
    label: `K${total.toLocaleString('en-ZM')}${m === 1 ? ' / month' : ` (${m} months)`}`,
  }
}
