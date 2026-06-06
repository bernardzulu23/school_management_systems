import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSchoolType, isIndividualOwner } from '@/lib/middleware/individual-gate'

export async function requireSoloTeacher(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!roleCheck(auth.user, ['TEACHER', 'teacher'])) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const typeCheck = await requireSchoolType(schoolId, ['INDIVIDUAL'])
  if (!typeCheck.allowed) return { ok: false, response: typeCheck.response }

  const owner = await isIndividualOwner(auth.user.id, schoolId)
  if (!owner) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Only the workspace owner can manage this' },
        { status: 403 }
      ),
    }
  }

  return { ok: true, auth, schoolId, school: typeCheck.school }
}
