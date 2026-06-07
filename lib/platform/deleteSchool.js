import prisma from '@/lib/prisma'

/**
 * Permanently delete a school tenant and related onboarding records.
 * Most relations cascade from School via Prisma onDelete: Cascade.
 */
export async function deleteSchoolAndData(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      subdomain: true,
      email: true,
      schoolType: true,
    },
  })

  if (!school) {
    return { ok: false, status: 404, error: 'School not found' }
  }

  await prisma.$transaction(async (tx) => {
    const registrationWhere = {
      OR: [
        ...(school.subdomain
          ? [{ subdomain: { equals: school.subdomain, mode: 'insensitive' } }]
          : []),
        ...(school.email ? [{ email: { equals: school.email, mode: 'insensitive' } }] : []),
      ],
    }

    if (registrationWhere.OR.length) {
      await tx.schoolRegistration.deleteMany({ where: registrationWhere })
    }

    await tx.school.delete({ where: { id: school.id } })
  })

  return {
    ok: true,
    deleted: {
      id: school.id,
      name: school.name,
      subdomain: school.subdomain,
      schoolType: school.schoolType,
    },
  }
}
