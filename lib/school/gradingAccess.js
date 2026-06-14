import { NextResponse } from 'next/server'
import { ApiError } from '@/lib/middleware/errorHandler'
import { canAccessSecondaryGrading } from '@/lib/subjects/resolveSubjectCatalog'
import { SCHOOL_LEVELS } from '@/lib/zambiaSchoolFeatures'
import { loadSchoolLevelContext } from '@/lib/school/schoolLevelContext'
import { basePrisma } from '@/lib/prisma/client'

export async function requireSecondaryGradingAccess(schoolId, { gradeLevel } = {}) {
  const school = await loadSchoolLevelContext(schoolId)
  if (!school) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School not found' }, { status: 404 }),
    }
  }

  const allowed = canAccessSecondaryGrading({
    schoolLevel: school.level,
    gradeLevel,
  })

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Secondary grading and term results are not available for primary grades (ECE–Grade 7). Use CBC continuous assessment instead.',
          code: 'PRIMARY_GRADING_UNAVAILABLE',
        },
        { status: 403 }
      ),
    }
  }

  return { ok: true, school }
}

/** For routes using withErrorHandler — throws ApiError when grading unavailable. */
export async function assertSecondaryGradingAccess(schoolId, { gradeLevel } = {}) {
  const check = await requireSecondaryGradingAccess(schoolId, { gradeLevel })
  if (!check.ok) {
    const body = await check.response.json().catch(() => ({}))
    throw new ApiError(body.error || 'Secondary grading unavailable', 403)
  }
  return check.school
}

export async function assertSecondaryGradingForContext(
  schoolId,
  { classId, gradeLevel, prismaClient = basePrisma } = {}
) {
  let resolvedGradeLevel = gradeLevel
  if (!resolvedGradeLevel && classId) {
    const cls = await prismaClient.class.findFirst({
      where: { id: String(classId), schoolId },
      select: { year_group: true, name: true },
    })
    resolvedGradeLevel = cls?.year_group || cls?.name || ''
  }

  const school = await loadSchoolLevelContext(schoolId)
  if (!school) throw new ApiError('School not found', 404)

  if (String(school.level || '').toLowerCase() === SCHOOL_LEVELS.PRIMARY) {
    throw new ApiError(
      'Secondary grading and term results are not available for primary schools (ECE–Grade 7). Use CBC continuous assessment instead.',
      403
    )
  }

  if (resolvedGradeLevel) {
    await assertSecondaryGradingAccess(schoolId, { gradeLevel: resolvedGradeLevel })
  }

  return school
}
