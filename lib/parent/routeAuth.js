import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { assertParentCanAccessStudent, isParentRole } from '@/lib/parent/links'

/**
 * Authenticate a parent user and resolve school context.
 */
export async function authorizeParentRoute(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!roleCheck(auth.user, ['PARENT', 'parent', 'guardian']) && !isParentRole(auth.user?.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'This request was blocked for security reasons.' },
        { status: 403 }
      ),
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

  return { ok: true, auth, schoolId, parentUserId: auth.user.id }
}

/**
 * Parent route + verified link to a specific studentId (query or body).
 */
export async function authorizeParentStudentAccess(request, studentId) {
  const access = await authorizeParentRoute(request)
  if (!access.ok) return access

  const sid = String(studentId || '').trim()
  if (!sid) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'studentId is required' }, { status: 400 }),
    }
  }

  const link = await assertParentCanAccessStudent(access.parentUserId, access.schoolId, sid)
  if (!link) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'This request was blocked for security reasons.' },
        { status: 403 }
      ),
    }
  }

  return { ...access, studentId: sid, link }
}
