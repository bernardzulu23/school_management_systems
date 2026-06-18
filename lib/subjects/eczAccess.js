import { canAccessEczFeatures } from '@/lib/subjects/resolveSubjectCatalog'
import { NextResponse } from 'next/server'
import { canUseECZSBA } from '@/lib/school/schoolTypeHelpers'
import { loadSchoolLevelContext } from '@/lib/school/schoolLevelContext'

export { loadSchoolLevelContext } from '@/lib/school/schoolLevelContext'

export async function requireSecondarySchoolAccess(schoolId, { gradeLevel } = {}) {
  const school = await loadSchoolLevelContext(schoolId)
  if (!school) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School not found' }, { status: 404 }),
    }
  }

  const allowed =
    canUseECZSBA(school) &&
    canAccessEczFeatures({
      schoolLevel: school.level,
      gradeLevel,
    })

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'ECZ assessments are only available for secondary schools',
          code: 'SCHOOL_TYPE_GATE',
        },
        { status: 403 }
      ),
    }
  }

  return { ok: true, school }
}
