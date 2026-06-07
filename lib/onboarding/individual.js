import { createEnrollmentInvite } from '@/lib/solo/enrollmentInvites'
import { syncEczSubjects } from '@/lib/ecz/sync-ecz-subjects'
import { normalizePlanSlug } from '@/lib/billing/plan-pricing'
import { trialEndsAtFromStart } from '@/lib/billing/subscription'

export const INDIVIDUAL_TEACHER_PLANS = new Set([
  'individual',
  'individual_free',
  'individual_premium',
  'individual_annual',
])

export const INDIVIDUAL_PLANS = new Set([...INDIVIDUAL_TEACHER_PLANS])

export const SCHOOL_PLANS = new Set(['trial', 'basic', 'standard', 'premium'])

export function isIndividualRegistration(reg) {
  return String(reg?.schoolType || 'SCHOOL').toUpperCase() === 'INDIVIDUAL'
}

export function individualPlanRequiresPayment(plan) {
  const p = normalizePlanSlug(plan)
  return ['individual', 'individual_premium', 'individual_annual'].includes(p)
}

/** Payment is deferred until after the 2-month trial at signup. */
export function individualPlanRequiresPaymentAtSignup() {
  return false
}

export function planToIndividualExpiresAt(plan, months) {
  const p = normalizePlanSlug(plan)
  if (p === 'individual_annual') {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  }
  if (['individual', 'individual_premium'].includes(p)) {
    const m = Math.max(1, Math.min(12, Number(months) || 1))
    return new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000)
  }
  return null
}

export function resolveStoredIndividualPlan(plan) {
  const p = normalizePlanSlug(plan || 'individual')
  if (p === 'individual_annual') return 'individual_premium'
  return p
}

export function individualOnboardingRedirectPath(_reg, step) {
  return `/join?step=${step}`
}

export async function generateIndividualSubdomain(firstName, prisma, reserved) {
  const base =
    String(firstName || 'teacher')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12) || 'teacher'

  for (let i = 0; i < 8; i++) {
    const subdomain = `${base}${Math.floor(1000 + Math.random() * 9000)}`
    if (reserved.has(subdomain)) continue
    const taken = await prisma.school.findFirst({
      where: { subdomain: { equals: subdomain, mode: 'insensitive' } },
      select: { id: true },
    })
    if (!taken) return subdomain
  }
  return `${base}${Date.now().toString().slice(-6)}`
}

async function createIndividualSchoolWithUser({
  prisma,
  tx,
  reg,
  adminName,
  adminPhone,
  baseDomain,
}) {
  if (!reg?.isVerified) {
    throw new Error('Email must be verified before creating workspace')
  }

  const plan = String(reg.plan || 'individual').toLowerCase()
  const storedPlan = resolveStoredIndividualPlan(plan)
  const paymentStatus = String(reg.paymentStatus || '').toLowerCase()
  const isPaidSignup = paymentStatus === 'paid'
  const firstName = adminName.split(/\s+/)[0] || adminName
  const subdomain = await generateIndividualSubdomain(firstName, prisma, new Set())
  const province = 'Lusaka'
  const district = 'Lusaka'
  const reportingStreamKey = 'lusaka/lusaka'

  let school
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      school = await tx.school.create({
        data: {
          name: `${adminName}'s Workspace`,
          subdomain,
          domain: `${subdomain}.${baseDomain}`,
          email: reg.email,
          ...(adminPhone ? { phone: String(adminPhone).trim() || null } : {}),
          plan: storedPlan,
          planExpiresAt: isPaidSignup
            ? planToIndividualExpiresAt(plan, reg.subscriptionMonths)
            : null,
          trialEndsAt: isPaidSignup ? null : trialEndsAtFromStart(),
          level: 'secondary',
          province,
          district,
          reportingStreamKey,
          active: true,
          emailVerified: true,
          schoolType: 'INDIVIDUAL',
        },
      })
      break
    } catch (e) {
      if (String(e?.code) === 'P2002' && attempt < 4) continue
      throw e
    }
  }

  await createEnrollmentInvite(tx, school.id)

  const user = await tx.user.create({
    data: {
      schoolId: school.id,
      email: reg.email,
      password: reg.passwordHash,
      name: adminName,
      role: 'teacher',
      ...(adminPhone ? { contact_number: String(adminPhone).trim() || null } : {}),
    },
  })

  await tx.school.update({
    where: { id: school.id },
    data: { ownerUserId: user.id },
  })

  await tx.schoolRegistration.update({
    where: { id: reg.id },
    data: {
      schoolName: school.name,
      subdomain: school.subdomain,
      level: 'secondary',
      adminName,
      province,
      district,
      reportingStreamKey,
    },
  })

  await seedSubjectsForSchool(tx, {
    id: school.id,
    level: school.level,
    enabledLocalLanguages: [],
  })

  return { school, user, subdomain }
}

async function seedSubjectsForSchool(db, school) {
  const { seedSubjectsForSchool: seed } = await import('@/lib/subjects/seedSubjects')
  return seed(db, school)
}

export async function completeIndividualOnboarding({
  prisma,
  reg,
  adminName,
  adminPhone,
  baseDomain,
  isLocal,
}) {
  let createdSchool
  let createdUser

  await prisma.$transaction(async (tx) => {
    const result = await createIndividualSchoolWithUser({
      prisma,
      tx,
      reg,
      adminName,
      adminPhone,
      baseDomain,
    })
    createdSchool = result.school
    createdUser = result.user
  })

  try {
    await syncEczSubjects(prisma, createdSchool.id)
  } catch (seedErr) {
    console.error('ECZ seed after individual onboarding:', seedErr)
  }

  const loginUrl = isLocal ? `/login` : `https://${createdSchool.subdomain}.${baseDomain}/login`

  return {
    school: createdSchool,
    user: createdUser,
    loginUrl,
    redirectUrl: '/dashboard/solo',
  }
}
