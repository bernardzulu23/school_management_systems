/** Monthly subscription prices in ZMW (mobile money). */
export const PLAN_PRICING = {
  basic: 500,
  standard: 800,
  premium: 1200,
  /** Solo teacher workspace — up to 5 students, ECZ tools */
  individual: 50,
  /** @deprecated legacy slug — treated as `individual` */
  individual_free: 50,
  individual_premium: 99,
  individual_annual: 799,
  student_free: 0,
  /** Independent student premium — student-facing dashboard only */
  student_premium: 99,
}

export const PLAN_LABELS = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  individual: 'Individual Teacher',
  individual_free: 'Individual Teacher',
  individual_premium: 'Individual Premium',
  individual_annual: 'Individual Premium (Annual)',
  student_free: 'Student Free',
  student_premium: 'Student Premium',
}

export const PLAN_DESCRIPTIONS = {
  basic: 'Up to 300 students · Core modules',
  standard: 'Up to 800 students · Analytics + SMS',
  premium: 'Unlimited · All features + priority support',
  individual: 'Solo teacher · Up to 5 students · ECZ tools · 2-month trial · K50/month after',
  individual_free: 'Solo teacher · Up to 5 students · ECZ tools · 2-month trial · K50/month after',
  individual_premium: 'Solo teacher · Unlimited students · AI tools',
  individual_annual: 'Individual Premium billed yearly (K799)',
  student_free: 'Student Starter (2-month trial, then subscribe)',
  student_premium:
    'Student dashboard · ECZ practice & premium study tools · 2-month trial · K99/month after',
}

/** Max students a solo teacher can register per plan. */
export const INDIVIDUAL_STUDENT_LIMIT = {
  individual: 5,
  individual_free: 5,
  individual_premium: Infinity,
  individual_annual: Infinity,
  student_free: Infinity,
  student_premium: Infinity,
}

/** @deprecated No plan skips subscription — all roles get a 2-month trial then must pay. */
export const FREE_INDIVIDUAL_PLANS = new Set([])

/** Plans that unlock AI generation features. */
export const AI_PLANS = [
  'individual_premium',
  'individual_annual',
  'student_premium',
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

export const INDIVIDUAL_STUDENT_PLANS = new Set(['student_free', 'student_premium'])

export const INDIVIDUAL_PLANS = new Set([...INDIVIDUAL_TEACHER_PLANS, ...INDIVIDUAL_STUDENT_PLANS])

export const PAID_INDIVIDUAL_PLAN_SLUGS = [
  'individual',
  'individual_free',
  'individual_premium',
  'individual_annual',
  'student_premium',
]

export function normalizePlanSlug(plan) {
  const key = String(plan || '').toLowerCase()
  if (key === 'individual_free') return 'individual'
  return key
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
