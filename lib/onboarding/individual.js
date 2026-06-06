import { generateEnrollmentCode } from '@/lib/utils/enrollment-code'
import { syncEczSubjects } from '@/lib/ecz/sync-ecz-subjects'
import { normalizePlanSlug } from '@/lib/billing/plan-pricing'
import { trialEndsAtFromStart } from '@/lib/billing/subscription'

export const INDIVIDUAL_TEACHER_PLANS = new Set([
  'individual',
  'individual_free',
  'individual_premium',
  'individual_annual',
])

export const INDIVIDUAL_STUDENT_PLANS = new Set(['student_free', 'student_premium'])

export const INDIVIDUAL_PLANS = new Set([...INDIVIDUAL_TEACHER_PLANS, ...INDIVIDUAL_STUDENT_PLANS])

export const SCHOOL_PLANS = new Set(['trial', 'basic', 'standard', 'premium'])

export function isIndividualRegistration(reg) {
  return String(reg?.schoolType || 'SCHOOL').toUpperCase() === 'INDIVIDUAL'
}

export function isStudentIndividualRegistration(reg) {
  return (
    isIndividualRegistration(reg) &&
    String(reg?.accountType || 'teacher').toLowerCase() === 'student'
  )
}

export function individualPlanRequiresPayment(plan) {
  const p = normalizePlanSlug(plan)
  return [
    'individual',
    'student_premium',
    'individual_premium',
    'individual_annual',
    'student_free',
  ].includes(p)
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
  if (['individual', 'individual_premium', 'student_premium'].includes(p)) {
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

export function individualOnboardingRedirectPath(reg, step) {
  const accountType = String(reg?.accountType || 'teacher').toLowerCase()
  const base = accountType === 'student' ? '/join/student' : '/join'
  return `${base}?step=${step}`
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
  role,
  workspaceName,
}) {
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
    const enrollmentCode = role === 'teacher' ? generateEnrollmentCode() : null
    try {
      school = await tx.school.create({
        data: {
          name: workspaceName,
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
          ...(enrollmentCode ? { enrollmentCode } : {}),
        },
      })
      break
    } catch (e) {
      if (String(e?.code) === 'P2002' && attempt < 4) continue
      throw e
    }
  }

  const user = await tx.user.create({
    data: {
      schoolId: school.id,
      email: reg.email,
      password: reg.passwordHash,
      name: adminName,
      role,
      ...(adminPhone ? { contact_number: String(adminPhone).trim() || null } : {}),
    },
  })

  if (role === 'teacher') {
    await tx.school.update({
      where: { id: school.id },
      data: { ownerUserId: user.id },
    })
  }

  if (role === 'student') {
    await tx.student.create({
      data: {
        id: `STU${Date.now().toString().slice(-8)}`,
        userId: user.id,
        schoolId: school.id,
        name: adminName,
        class: 'Independent',
      },
    })
  }

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

// lazy import avoid circular dep in seedSubjects
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
  reserved,
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
      role: 'teacher',
      workspaceName: `${adminName}'s Workspace`,
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

export async function completeIndividualStudentOnboarding({
  prisma,
  reg,
  adminName,
  adminPhone,
  baseDomain,
  isLocal,
  enrollmentCode,
}) {
  let createdSchool
  let createdUser
  let subdomain
  let enrolledUnderTeacher = false
  let teacherName = null

  await prisma.$transaction(async (tx) => {
    const result = await createIndividualSchoolWithUser({
      prisma,
      tx,
      reg,
      adminName,
      adminPhone,
      baseDomain,
      role: 'student',
      workspaceName: `${adminName}'s Study Space`,
    })
    createdSchool = result.school
    createdUser = result.user
    subdomain = result.subdomain

    const code = String(enrollmentCode || '')
      .trim()
      .toUpperCase()
    if (code) {
      const teacherSchool = await tx.school.findFirst({
        where: { enrollmentCode: code, schoolType: 'INDIVIDUAL', active: true },
        select: { id: true, name: true, subdomain: true, ownerUserId: true, plan: true },
      })
      if (teacherSchool?.ownerUserId) {
        const studentRow = await tx.student.findFirst({
          where: { userId: createdUser.id, schoolId: createdSchool.id },
        })
        if (studentRow) {
          await tx.student.delete({ where: { id: studentRow.id } })
        }
        await tx.user.update({
          where: { id: createdUser.id },
          data: { schoolId: teacherSchool.id },
        })
        await tx.student.create({
          data: {
            id: `STU${Date.now().toString().slice(-8)}`,
            userId: createdUser.id,
            schoolId: teacherSchool.id,
            name: adminName,
            class: 'Independent',
          },
        })
        await tx.school.delete({ where: { id: createdSchool.id } })
        createdSchool = teacherSchool
        enrolledUnderTeacher = true
        teacherName = teacherSchool.name
      }
    }
  })

  const loginUrl = isLocal ? `/login` : `https://${createdSchool.subdomain}.${baseDomain}/login`

  return {
    school: createdSchool,
    user: createdUser,
    loginUrl,
    redirectUrl: '/dashboard/student',
    enrolledUnderTeacher,
    teacherName,
  }
}
