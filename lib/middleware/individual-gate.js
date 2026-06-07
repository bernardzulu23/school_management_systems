import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { AI_PLANS, INDIVIDUAL_STUDENT_LIMIT } from '@/lib/billing/plan-pricing'

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
 * Restrict AI-generation features to Premium plans (school or individual).
 */
export async function requireAIPlan(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { plan: true, schoolType: true, trialEndsAt: true },
  })
  const plan = String(school?.plan || '').toLowerCase()
  const onTrial = school?.trialEndsAt && new Date(school.trialEndsAt).getTime() > Date.now()
  if (!school || (!AI_PLANS.includes(plan) && !onTrial && plan !== 'premium')) {
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
  return { allowed: true, school }
}

/**
 * Enforce student cap for Individual Free tier.
 */
export async function checkStudentCap(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { plan: true, schoolType: true },
  })
  if (school?.schoolType !== 'INDIVIDUAL') return { allowed: true }

  const plan = String(school.plan || 'individual').toLowerCase()
  const limit = INDIVIDUAL_STUDENT_LIMIT[plan] ?? 10
  if (limit === Infinity) return { allowed: true }

  const count = await prisma.user.count({
    where: { schoolId, role: { equals: 'student', mode: 'insensitive' } },
  })
  if (count >= limit) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: `Student limit reached (${limit}). Upgrade to Individual Premium for unlimited students.`,
          code: 'STUDENT_CAP_REACHED',
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
