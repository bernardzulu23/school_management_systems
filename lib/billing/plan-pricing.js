/** Monthly subscription prices in ZMW (mobile money). */
export const PLAN_PRICING = {
  basic: 500,
  standard: 800,
  premium: 1200,
}

export const PLAN_LABELS = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
}

export const PLAN_DESCRIPTIONS = {
  basic: 'Up to 300 students · Core modules',
  standard: 'Up to 800 students · Analytics + SMS',
  premium: 'Unlimited · All features + priority support',
}

export function getPlanMonthlyPrice(plan) {
  const key = String(plan || '').toLowerCase()
  return PLAN_PRICING[key] ?? null
}

export function formatPlanPrice(plan, months = 1) {
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
