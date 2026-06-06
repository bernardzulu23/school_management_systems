import { basePrisma } from '@/lib/prisma/client'
import { canAccessEczFeatures } from '@/lib/subjects/resolveSubjectCatalog'
import { NextResponse } from 'next/server'

export async function loadSchoolLevelContext(schoolId) {
  if (!schoolId) return null
  return basePrisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, level: true, enabledLocalLanguages: true },
  })
}

export async function requireSecondarySchoolAccess(schoolId, { gradeLevel } = {}) {
  const school = await loadSchoolLevelContext(schoolId)
  if (!school) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School not found' }, { status: 404 }),
    }
  }

  const allowed = canAccessEczFeatures({
    schoolLevel: school.level,
    gradeLevel,
  })

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'ECZ assessments are only available for secondary schools',
          code: 'SECONDARY_ONLY',
        },
        { status: 403 }
      ),
    }
  }

  return { ok: true, school }
}
