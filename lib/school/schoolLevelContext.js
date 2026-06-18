import { basePrisma } from '@/lib/prisma/client'

export async function loadSchoolLevelContext(schoolId) {
  if (!schoolId) return null
  return basePrisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      level: true,
      ownershipType: true,
      schoolType: true,
      enabledLocalLanguages: true,
      plan: true,
      trialEndsAt: true,
    },
  })
}
