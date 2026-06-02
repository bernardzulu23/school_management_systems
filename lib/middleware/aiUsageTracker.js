import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { checkAIBurstLimit } from '@/lib/middleware/aiBurstLimit'

export function normalizePlan(value) {
  const plan = String(value || 'trial')
    .trim()
    .toLowerCase()
  if (['trial', 'basic', 'standard', 'premium', 'unpaid'].includes(plan)) return plan
  return 'trial'
}

export function getMonthlyLimit(plan) {
  const p = normalizePlan(plan)
  if (p === 'unpaid') return 0
  if (p === 'premium') return Number.POSITIVE_INFINITY
  if (p === 'standard') return 50
  if (p === 'trial') return 10
  if (p === 'basic') return 0
  return 0
}

export function getPerMinuteLimit(plan) {
  const p = normalizePlan(plan)
  if (p === 'unpaid') return 0
  if (p === 'premium') return 60
  if (p === 'standard') return 10
  if (p === 'trial') return 5
  if (p === 'basic') return 1
  return 1
}

export function getMonthKey(date = new Date()) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export async function getSchoolPlanForUsage(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: String(schoolId || '') },
    select: { id: true, plan: true, planExpiresAt: true, trialEndsAt: true },
  })
  if (!school) return null
  return {
    id: school.id,
    plan: normalizePlan(school.plan),
    planExpiresAt: school.planExpiresAt,
    trialEndsAt: school.trialEndsAt,
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
 * Monthly plan quota + optional per-user burst limit (20/min).
 * @param {string} schoolId
 * @param {string|null} [userId] — when set, enforces AI burst rate limit
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

  const now = new Date()
  const isTrialExpired =
    school.plan === 'trial' &&
    school.trialEndsAt &&
    new Date(school.trialEndsAt).getTime() < now.getTime()
  const isPlanExpired =
    school.plan !== 'trial' &&
    school.planExpiresAt &&
    new Date(school.planExpiresAt).getTime() < now.getTime()

  if (isTrialExpired || isPlanExpired) {
    return NextResponse.json(
      {
        error: 'Your plan has expired',
        code: 'PLAN_EXPIRED',
        plan: school.plan,
        expiryDate: school.planExpiresAt || school.trialEndsAt || null,
      },
      { status: 402 }
    )
  }

  const limit = getMonthlyLimit(school.plan)
  if (!Number.isFinite(limit)) return null

  const monthKey = getMonthKey()
  const used = await getMonthlyUsageCount(school.id, monthKey)
  if (used >= limit) {
    return NextResponse.json(
      {
        error: 'Monthly AI limit reached',
        code: 'AI_LIMIT_REACHED',
        plan: school.plan,
        monthKey,
        used,
        limit,
      },
      { status: 429 }
    )
  }

  return null
}

export async function trackAIUsage(schoolId, featureId) {
  const monthKey = getMonthKey()
  const key = {
    schoolId: String(schoolId || ''),
    monthKey,
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
