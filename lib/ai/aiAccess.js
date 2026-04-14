import prisma from '@/lib/prisma'

export function normalizePlan(value) {
  const plan = String(value || 'trial')
    .trim()
    .toLowerCase()
  if (['trial', 'basic', 'standard', 'premium'].includes(plan)) return plan
  return 'trial'
}

export function getMonthlyAIQuota(plan) {
  const p = normalizePlan(plan)
  if (p === 'premium') return Number.POSITIVE_INFINITY
  if (p === 'trial') return 50
  if (p === 'standard') return 50
  if (p === 'basic') return 5
  return 5
}

export function getPerMinuteLimit(plan) {
  const p = normalizePlan(plan)
  if (p === 'premium') return 100
  if (p === 'trial') return 10
  if (p === 'standard') return 10
  if (p === 'basic') return 2
  return 2
}

export async function getSchoolPlan(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: String(schoolId || '') },
    select: { id: true, plan: true },
  })
  if (!school) return null
  return { id: school.id, plan: normalizePlan(school.plan) }
}

export async function checkMonthlyAIQuota(schoolId) {
  const school = await getSchoolPlan(schoolId)
  if (!school) return null

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const used = await prisma.aIRequest.count({
    where: {
      schoolId: school.id,
      createdAt: { gte: since },
    },
  })

  const limit = getMonthlyAIQuota(school.plan)
  const remaining = Number.isFinite(limit) ? Math.max(0, limit - used) : Number.POSITIVE_INFINITY
  const exceeded = Number.isFinite(limit) ? used >= limit : false

  return { plan: school.plan, used, limit, remaining, exceeded }
}
