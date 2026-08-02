import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getSchoolStudentLimit, INDIVIDUAL_STUDENT_LIMIT } from '@/lib/billing/plan-pricing'

/**
 * Restrict a route to specific school types.
 * @param {string} schoolId
 * @param {('SCHOOL'|'INDIVIDUAL')[]} allowedTypes
 */
export async function requireSchoolType(schoolId, allowedTypes = ['SCHOOL', 'INDIVIDUAL']) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { schoolType: true, plan: true, ownerUserId: true },
  })
  if (!school || !allowedTypes.includes(school.schoolType)) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'This feature is not available on your account type.',
          code: 'SCHOOL_TYPE_DENIED',
        },
        { status: 403 }
      ),
    }
  }
  return { allowed: true, school }
}

/**
 * Restrict AI-generation features to plans that include ai-tools (not Basic).
 */
export async function requireAIPlan(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { plan: true, schoolType: true, trialEndsAt: true },
  })
  if (!school) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'AI tools require an Individual Premium or school subscription.',
          code: 'PLAN_AI_REQUIRED',
        },
        { status: 402 }
      ),
    }
  }
  const { planIncludes } = await import('@/lib/zambiaSchoolFeatures')
  const plan = String(school.plan || '').toLowerCase()
  if (!planIncludes(plan, 'ai-tools', school)) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'AI tools require Standard, Premium, or an active trial.',
          code: 'PLAN_AI_REQUIRED',
          requiredPlan: 'standard',
        },
        { status: 403 }
      ),
    }
  }
  return { allowed: true, school }
}

/**
 * Enforce student cap for school and individual plans.
 */
export async function checkStudentCap(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { plan: true, schoolType: true, trialEndsAt: true },
  })
  if (!school) return { allowed: true }

  const plan = String(school.plan || '').toLowerCase()
  const onTrial =
    plan === 'trial' || (school.trialEndsAt && new Date(school.trialEndsAt).getTime() > Date.now())

  let limit
  if (school.schoolType === 'INDIVIDUAL') {
    limit = INDIVIDUAL_STUDENT_LIMIT[plan] ?? 10
  } else {
    limit = getSchoolStudentLimit(plan)
    if (onTrial) limit = Infinity
  }

  if (limit === Infinity) return { allowed: true }

  const count = await prisma.user.count({
    where: { schoolId, role: { equals: 'student', mode: 'insensitive' } },
  })
  if (count >= limit) {
    const upgradeHint =
      school.schoolType === 'INDIVIDUAL'
        ? 'Upgrade to Individual Premium for unlimited students.'
        : plan === 'basic'
          ? 'Upgrade to Standard or Premium for more students.'
          : 'Upgrade to Premium for unlimited students.'
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: `Student limit reached (${limit}). ${upgradeHint}`,
          code: 'STUDENT_CAP_REACHED',
          limit,
          count,
        },
        { status: 402 }
      ),
    }
  }
  return { allowed: true, count, limit }
}

export async function isIndividualSchool(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { schoolType: true },
  })
  return school?.schoolType === 'INDIVIDUAL'
}

export async function isIndividualOwner(userId, schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { schoolType: true, ownerUserId: true },
  })
  return school?.schoolType === 'INDIVIDUAL' && school.ownerUserId === userId
}
