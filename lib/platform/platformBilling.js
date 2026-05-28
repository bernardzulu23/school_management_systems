/**
 * Platform billing aggregates — payment metadata only.
 */
import prisma from '@/lib/prisma'
import { getSubscriptionState } from '@/lib/billing/subscription'

export async function getPlatformBillingSummary() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  const [schools, paymentsLast30, recentPaidCount, trialSchools, paidSchools] = await Promise.all([
    prisma.school.findMany({
      where: { emailVerified: true },
      select: {
        id: true,
        plan: true,
        active: true,
        trialEndsAt: true,
        planExpiresAt: true,
        createdAt: true,
      },
    }),
    prisma.schoolPlanPayment.findMany({
      where: {
        status: 'paid',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { amount: true, plan: true },
    }),
    prisma.schoolPlanPayment.count({
      where: { status: 'paid', createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.school.count({
      where: { plan: 'trial', active: true, emailVerified: true },
    }),
    prisma.school.count({
      where: {
        plan: { in: ['basic', 'standard', 'premium'] },
        active: true,
        emailVerified: true,
      },
    }),
  ])

  const planDistribution = {}
  let expiringWithin14Days = 0
  for (const s of schools) {
    const plan = String(s.plan || 'trial').toLowerCase()
    planDistribution[plan] = (planDistribution[plan] || 0) + 1
    const sub = getSubscriptionState(s, now)
    if (sub.daysLeft != null && sub.daysLeft <= 14 && sub.active) expiringWithin14Days++
  }

  const mrrEstimateZmw = paymentsLast30.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  const conversionRate =
    trialSchools + paidSchools > 0
      ? Math.round((paidSchools / (trialSchools + paidSchools)) * 1000) / 10
      : 0

  return {
    planDistribution,
    mrrEstimateZmw,
    paidTransactionsLast30Days: recentPaidCount,
    trialSchools,
    paidSchools,
    trialToPaidConversionPercent: conversionRate,
    expiringWithin14Days,
    currency: 'ZMW',
  }
}

/**
 * @param {{ page?: number, limit?: number }} opts
 */
export async function listPlatformPayments(opts = {}) {
  const page = Math.max(1, Number(opts.page) || 1)
  const limit = Math.min(50, Math.max(10, Number(opts.limit) || 20))
  const skip = (page - 1) * limit

  const [rows, total] = await Promise.all([
    prisma.schoolPlanPayment.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        plan: true,
        amount: true,
        status: true,
        provider: true,
        createdAt: true,
        school: { select: { name: true, subdomain: true } },
      },
    }),
    prisma.schoolPlanPayment.count(),
  ])

  return {
    payments: rows.map((p) => ({
      id: p.id,
      schoolName: p.school?.name || '—',
      subdomain: p.school?.subdomain || '—',
      plan: p.plan,
      amount: p.amount,
      status: p.status,
      provider: p.provider,
      createdAt: p.createdAt,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}
