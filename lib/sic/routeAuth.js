import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getActiveSicAssignment, isSchoolAdminOrHead } from '@/lib/sic/sicAccess'

export async function authorizeSicAdmin(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!isSchoolAdminOrHead(auth.user)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
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

  return { ok: true, auth, schoolId }
}

export async function authorizeSicPortal(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  const assignment = await getActiveSicAssignment(prisma, auth.user.id, schoolId)
  if (!assignment) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, auth, schoolId, assignment }
}

/** SIC portal or school head/admin */
export async function authorizeSicOrHead(request) {
  const portal = await authorizeSicPortal(request)
  if (portal.ok) return { ...portal, isHead: false }

  const head = await authorizeSicAdmin(request)
  if (head.ok) return { ...head, isHead: true, assignment: null }
  return portal
}

/** HOD (or head/admin) submitting department CPD plans / minutes */
export async function authorizeDepartmentPlanSubmitter(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return { ok: false, response: tenant.response }
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'School context required' }, { status: 400 }),
    }
  }

  if (isSchoolAdminOrHead(auth.user)) {
    return { ok: true, auth, schoolId }
  }

  const role = String(auth.user?.role || '').toLowerCase()
  if (role === 'hod' || role === 'head_of_department') {
    return { ok: true, auth, schoolId }
  }

  const hodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!hodProfile) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, auth, schoolId }
}
