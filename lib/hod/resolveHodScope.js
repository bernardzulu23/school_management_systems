import prisma from '@/lib/prisma'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { ApiError } from '@/lib/middleware/errorHandler'
import { requireSchoolType } from '@/lib/middleware/individual-gate'

/**
 * Authenticate HOD (or school admin) and return tenant DB + department scope.
 * @param {import('next/server').NextRequest} request
 */
export async function resolveHodScope(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) {
    return { ok: false, response: auth.response }
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: Response.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const typeCheck = await requireSchoolType(schoolId, ['SCHOOL'])
  if (!typeCheck.allowed) return { ok: false, response: typeCheck.response }

  const userId = String(auth.user?.id || '')
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])

  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId, schoolId },
    include: { departmentRef: { select: { id: true, name: true } } },
  })

  if (!hodProfile && !isAdmin) {
    throw new ApiError('HOD profile required', 403)
  }

  const departmentId = hodProfile?.departmentId || null
  const departmentName = hodProfile?.departmentRef?.name || hodProfile?.department || null

  const db = getTenantClient(schoolId)

  return {
    ok: true,
    auth,
    db,
    schoolId,
    userId,
    userName: auth.user?.name || '',
    departmentId,
    departmentName,
    isAdmin,
  }
}

/** Prisma where clause for department-scoped HOD records. */
export function hodDepartmentWhere(departmentId) {
  if (departmentId) return { departmentId }
  return { departmentId: null }
}
