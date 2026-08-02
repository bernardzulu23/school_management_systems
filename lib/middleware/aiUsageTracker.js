import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { checkAIBurstLimit } from '@/lib/middleware/aiBurstLimit'
import { getSubscriptionState } from '@/lib/billing/subscription'

export function normalizePlan(value) {
  const plan = String(value || 'trial')
    .trim()
    .toLowerCase()
  if (['trial', 'basic', 'standard', 'premium', 'unpaid'].includes(plan)) return plan
  return 'trial'
}

/**
 * Pricing-aligned AI quotas.
 * - trial: 10 / day
 * - basic: 0 (No AI)
 * - standard: 50 / month
 * - premium: unlimited
 */
export function getAiQuota(plan) {
  const p = normalizePlan(plan)
  if (p === 'unpaid' || p === 'basic') {
    return { limit: 0, period: 'day', keyFn: getDayKey }
  }
  if (p === 'premium') {
    return { limit: Number.POSITIVE_INFINITY, period: 'day', keyFn: getDayKey }
  }
  if (p === 'standard') {
    return { limit: 50, period: 'month', keyFn: getMonthKey }
  }
  // trial
  return { limit: 10, period: 'day', keyFn: getDayKey }
}

/** @deprecated Prefer getAiQuota — returns numeric limit for the plan's period. */
export function getDailyLimit(plan) {
  return getAiQuota(plan).limit
}

/**
 * Plan used for AI quotas. Trial stays trial (10/day) — never map to premium ∞.
 */
export function getEffectivePlanForAiLimits(school) {
  const sub = getSubscriptionState(school)
  if (!sub.active) return 'unpaid'
  if (sub.onTrial || sub.isTrialPlan) return 'trial'
  return normalizePlan(school?.plan)
}

/** @deprecated Use getAiQuota(plan).limit */
export function getMonthlyLimit(plan) {
  return getAiQuota(plan).limit
}

export function getDayKey(date = new Date()) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getPerMinuteLimit(plan) {
  const p = normalizePlan(plan)
  if (p === 'unpaid' || p === 'basic') return 0
  if (p === 'premium') return 60
  if (p === 'standard') return 10
  if (p === 'trial') return 5
  return 0
}

export function getMonthKey(date = new Date()) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export async function getDailyUsageCount(schoolId, dayKey = getDayKey()) {
  const rows = await prisma.aIUsageLog.findMany({
    where: { schoolId: String(schoolId || ''), monthKey: dayKey },
    select: { count: true },
  })
  return rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0)
}

export async function getSchoolPlanForUsage(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: String(schoolId || '') },
    select: {
      id: true,
      plan: true,
      planExpiresAt: true,
      trialEndsAt: true,
      createdAt: true,
      active: true,
    },
  })
  if (!school) return null
  const sub = getSubscriptionState(school)
  return {
    id: school.id,
    plan: getEffectivePlanForAiLimits(school),
    billingPlan: normalizePlan(school.plan),
    planExpiresAt: school.planExpiresAt,
    trialEndsAt: school.trialEndsAt,
    createdAt: school.createdAt,
    active: school.active,
    subscription: sub,
  }
}

export async function getMonthlyUsageCount(schoolId, monthKey = getMonthKey()) {
  const rows = await prisma.aIUsageLog.findMany({
    where: { schoolId: String(schoolId || ''), monthKey },
    select: { count: true },
  })
  return rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0)
}

/**
 * Sum usage for a calendar month when logs are stored as day keys (YYYY-MM-DD).
 */
export async function getUsageCountForPeriod(schoolId, periodKey, period) {
  const sid = String(schoolId || '')
  if (!sid || !periodKey) return 0

  if (period === 'month' && /^\d{4}-\d{2}$/.test(periodKey)) {
    const rows = await prisma.aIUsageLog.findMany({
      where: {
        schoolId: sid,
        OR: [{ monthKey: periodKey }, { monthKey: { startsWith: `${periodKey}-` } }],
      },
      select: { count: true },
    })
    return rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0)
  }

  return getDailyUsageCount(sid, periodKey)
}

/**
 * Plan quota + optional per-user burst limit.
 * @param {string} schoolId
 * @param {string|null} [userId]
 */
export async function checkAILimit(schoolId, userId = null) {
  if (userId) {
    const burstBlock = checkAIBurstLimit(userId)
    if (burstBlock) return burstBlock
  }

  const school = await getSchoolPlanForUsage(schoolId)
  if (!school) {
    return NextResponse.json(
      { error: 'School not found', code: 'SCHOOL_NOT_FOUND' },
      { status: 404 }
    )
  }

  const sub = school.subscription || getSubscriptionState(school)
  if (sub.expired) {
    return NextResponse.json(
      {
        error: 'Your plan has expired',
        code: 'PLAN_EXPIRED',
        plan: school.billingPlan || school.plan,
        expiryDate: sub.expiresAt || school.planExpiresAt || school.trialEndsAt || null,
      },
      { status: 402 }
    )
  }

  const quota = getAiQuota(school.plan)
  if (!Number.isFinite(quota.limit)) return null

  if (quota.limit <= 0) {
    return NextResponse.json(
      {
        error: 'AI features are not included in your plan',
        code: 'PLAN_UPGRADE_REQUIRED',
        plan: school.plan,
        requiredPlan: 'standard',
        used: 0,
        limit: 0,
      },
      { status: 403 }
    )
  }

  const periodKey = quota.keyFn()
  const used = await getUsageCountForPeriod(school.id, periodKey, quota.period)
  if (used >= quota.limit) {
    const label = quota.period === 'month' ? 'Monthly' : 'Daily'
    return NextResponse.json(
      {
        error: `${label} AI limit reached`,
        code: 'AI_LIMIT_REACHED',
        plan: school.plan,
        period: quota.period,
        periodKey,
        used,
        limit: quota.limit,
      },
      { status: 429 }
    )
  }

  return null
}

export async function trackAIUsage(schoolId, featureId) {
  const dayKey = getDayKey()
  const key = {
    schoolId: String(schoolId || ''),
    monthKey: dayKey,
    featureId: String(featureId || ''),
  }

  if (!key.schoolId || !key.featureId) return null

  const row = await prisma.aIUsageLog.upsert({
    where: { schoolId_monthKey_featureId: key },
    create: {
      id: crypto.randomUUID(),
      schoolId: key.schoolId,
      monthKey: key.monthKey,
      featureId: key.featureId,
      count: 1,
      lastUsedAt: new Date(),
    },
    update: { count: { increment: 1 }, lastUsedAt: new Date() },
    select: { id: true, count: true, monthKey: true, featureId: true },
  })

  return row
}
