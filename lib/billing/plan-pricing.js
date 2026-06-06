/** Monthly subscription prices in ZMW (mobile money). */
export const PLAN_PRICING = {
  basic: 500,
  standard: 800,
  premium: 1200,
  individual_free: 0,
  individual_premium: 99,
  individual_annual: 799,
  student_free: 0,
}

export const PLAN_LABELS = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  individual_free: 'Individual Free',
  individual_premium: 'Individual Premium',
  individual_annual: 'Individual Premium (Annual)',
  student_free: 'Student Free',
}

export const PLAN_DESCRIPTIONS = {
  basic: 'Up to 300 students · Core modules',
  standard: 'Up to 800 students · Analytics + SMS',
  premium: 'Unlimited · All features + priority support',
  individual_free: 'Solo teacher · Up to 5 students · ECZ tools',
  individual_premium: 'Solo teacher · Unlimited students · AI tools',
  individual_annual: 'Individual Premium billed yearly (K799)',
  student_free: 'Independent ECZ study · Always free',
}

/** Max students a solo teacher can register per plan. */
export const INDIVIDUAL_STUDENT_LIMIT = {
  individual_free: 5,
  individual_premium: Infinity,
  student_free: Infinity,
}

/** Plans that unlock AI generation features. */
export const AI_PLANS = [
  'individual_premium',
  'individual_annual',
  'basic',
  'standard',
  'premium',
  'trial',
]

export const INDIVIDUAL_PLANS = new Set([
  'individual_free',
  'individual_premium',
  'individual_annual',
  'student_free',
])

export function getPlanMonthlyPrice(plan) {
  const key = String(plan || '').toLowerCase()
  if (key === 'individual_annual') {
    return PLAN_PRICING.individual_annual / 12
  }
  return PLAN_PRICING[key] ?? null
}

export function formatPlanPrice(plan, months = 1) {
  const key = String(plan || '').toLowerCase()
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
