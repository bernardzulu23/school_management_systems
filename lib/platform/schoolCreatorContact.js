import prisma from '@/lib/prisma'

const HEAD_ROLES = ['headteacher', 'HEADTEACHER', 'admin', 'administrator', 'ADMIN']

/**
 * Attach creator name/phone for platform admin (onboarding admin / owner / first headteacher).
 * @param {Array<{ id: string, phone?: string | null, ownerUserId?: string | null }>} schools
 */
export async function attachCreatorContacts(schools) {
  if (!schools?.length) return []

  const schoolIds = schools.map((s) => s.id)
  const ownerIds = schools.map((s) => s.ownerUserId).filter(Boolean)

  const [owners, heads] = await Promise.all([
    ownerIds.length
      ? prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, name: true, contact_number: true, email: true },
        })
      : [],
    prisma.user.findMany({
      where: {
        schoolId: { in: schoolIds },
        role: { in: HEAD_ROLES },
      },
      select: {
        schoolId: true,
        name: true,
        contact_number: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const ownerById = new Map(owners.map((u) => [u.id, u]))
  const firstHeadBySchool = new Map()
  for (const head of heads) {
    if (!firstHeadBySchool.has(head.schoolId)) {
      firstHeadBySchool.set(head.schoolId, head)
    }
  }

  return schools.map((school) => {
    const owner = school.ownerUserId ? ownerById.get(school.ownerUserId) : null
    const head = firstHeadBySchool.get(school.id)
    const creatorName = owner?.name || head?.name || null
    const creatorPhone =
      String(school.phone || '').trim() ||
      String(owner?.contact_number || '').trim() ||
      String(head?.contact_number || '').trim() ||
      null
    const creatorEmail = owner?.email || head?.email || null

    return {
      ...school,
      creatorName,
      creatorPhone,
      creatorEmail,
    }
  })
}
