import { NextResponse } from 'next/server'
import { ApiError } from '@/lib/middleware/errorHandler'
import { canUseHOD } from '@/lib/school/schoolTypeHelpers'
import { loadSchoolLevelContext } from '@/lib/school/schoolLevelContext'

export async function requireHodSchoolAccess(schoolId) {
  const school = await loadSchoolLevelContext(schoolId)
  if (!school) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School not found' }, { status: 404 }),
    }
  }

  if (!canUseHOD(school)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'HOD features are not available for primary schools (ECE–Grade 7)',
          code: 'SCHOOL_TYPE_GATE',
        },
        { status: 403 }
      ),
    }
  }

  return { ok: true, school }
}

/** For routes using withErrorHandler — throws ApiError on primary schools. */
export async function assertHodSchoolAccess(schoolId) {
  const check = await requireHodSchoolAccess(schoolId)
  if (!check.ok) {
    const body = await check.response.json().catch(() => ({}))
    throw new ApiError(body.error || 'HOD features unavailable', 403)
  }
  return check.school
}
