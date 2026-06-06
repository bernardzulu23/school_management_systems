import { generateEnrollmentCode } from '@/lib/utils/enrollment-code'
import { syncEczSubjects } from '@/lib/ecz/sync-ecz-subjects'

export const INDIVIDUAL_PLANS = new Set([
  'individual_free',
  'individual_premium',
  'individual_annual',
])

export const SCHOOL_PLANS = new Set(['trial', 'basic', 'standard', 'premium'])

export function isIndividualRegistration(reg) {
  return String(reg?.schoolType || 'SCHOOL').toUpperCase() === 'INDIVIDUAL'
}

export function individualPlanRequiresPayment(plan) {
  const p = String(plan || '').toLowerCase()
  return p === 'individual_premium' || p === 'individual_annual'
}

export function planToIndividualExpiresAt(plan, months) {
  const p = String(plan || '').toLowerCase()
  if (p === 'individual_annual') {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  }
  if (p === 'individual_premium') {
    const m = Math.max(1, Math.min(12, Number(months) || 1))
    return new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000)
  }
  return null
}

export function resolveStoredIndividualPlan(plan) {
  const p = String(plan || 'individual_free').toLowerCase()
  if (p === 'individual_annual') return 'individual_premium'
  return p
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

export async function completeIndividualOnboarding({
  prisma,
  reg,
  adminName,
  adminPhone,
  baseDomain,
  isLocal,
  reserved,
}) {
  const plan = String(reg.plan || 'individual_free').toLowerCase()
  const storedPlan = resolveStoredIndividualPlan(plan)
  const firstName = adminName.split(/\s+/)[0] || adminName
  const subdomain = await generateIndividualSubdomain(firstName, prisma, reserved)
  const province = 'Lusaka'
  const district = 'Lusaka'
  const reportingStreamKey = 'lusaka/lusaka'
  const loginUrl = isLocal ? `/login` : `https://${subdomain}.${baseDomain}/login`

  let createdSchool
  let createdUser

  await prisma.$transaction(async (tx) => {
    let school
    for (let attempt = 0; attempt < 5; attempt++) {
      const enrollmentCode = generateEnrollmentCode()
      try {
        school = await tx.school.create({
          data: {
            name: `${adminName}'s Workspace`,
            subdomain,
            domain: `${subdomain}.${baseDomain}`,
            email: reg.email,
            ...(adminPhone ? { phone: String(adminPhone).trim() || null } : {}),
            plan: storedPlan,
            planExpiresAt: individualPlanRequiresPayment(plan)
              ? planToIndividualExpiresAt(plan, reg.subscriptionMonths)
              : null,
            trialEndsAt: null,
            level: 'secondary',
            province,
            district,
            reportingStreamKey,
            active: true,
            emailVerified: true,
            schoolType: 'INDIVIDUAL',
            enrollmentCode,
          },
        })
        break
      } catch (e) {
        if (String(e?.code) === 'P2002' && attempt < 4) continue
        throw e
      }
    }

    createdUser = await tx.user.create({
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
      data: { ownerUserId: createdUser.id },
    })

    await tx.schoolRegistration.update({
      where: { id: reg.id },
      data: {
        schoolName: school.name,
        subdomain,
        level: 'secondary',
        adminName,
        province,
        district,
        reportingStreamKey,
      },
    })

    createdSchool = school
  })

  try {
    await syncEczSubjects(prisma, createdSchool.id)
  } catch (seedErr) {
    console.error('ECZ seed after individual onboarding:', seedErr)
  }

  return {
    school: createdSchool,
    user: createdUser,
    loginUrl,
    redirectUrl: '/dashboard/solo',
  }
}
