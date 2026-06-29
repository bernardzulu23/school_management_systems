import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSchoolTypeAccess } from '@/lib/middleware/schoolTypeGate'
import { ApiError } from '@/lib/middleware/errorHandler'
import {
  canUserManageCareerGuidance,
  getActiveGuidanceAssignment,
  isSchoolAdminOrHead,
} from '@/lib/guidance/guidanceAccess'

/**
 * Standard auth for guidance assignment admin APIs (headteacher only).
 */
export async function authorizeGuidanceAssignmentAdmin(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!isSchoolAdminOrHead(auth.user)) {
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

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'career-guidance')
  if (typeBlock) return { ok: false, response: typeBlock }

  return { ok: true, auth, schoolId }
}

/**
 * Auth for guidance teachers viewing their own assignment (or head listing all).
 */
export async function authorizeGuidanceAssignmentRead(request) {
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

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'career-guidance')
  if (typeBlock) return { ok: false, response: typeBlock }

  if (isSchoolAdminOrHead(auth.user)) {
    return { ok: true, auth, schoolId, isHead: true }
  }

  const own = await getActiveGuidanceAssignment(prisma, auth.user.id, schoolId)
  if (!own) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, auth, schoolId, isHead: false, assignment: own }
}

/**
 * Auth for guidance portal APIs (active assignment required, or head/admin).
 */
export async function authorizeGuidancePortal(request) {
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

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'career-guidance')
  if (typeBlock) return { ok: false, response: typeBlock }

  const assignment = await getActiveGuidanceAssignment(prisma, auth.user.id, schoolId)
  if (!assignment) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, auth, schoolId, assignment }
}

/**
 * Headteacher-only guidance reporting and safeguarding escalations.
 */
export async function authorizeGuidanceHead(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return { ok: false, response: auth.response }

  if (!isSchoolAdminOrHead(auth.user)) {
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

  const typeBlock = await requireSchoolTypeAccess(schoolId, 'career-guidance')
  if (typeBlock) return { ok: false, response: typeBlock }

  return { ok: true, auth, schoolId, isHead: true }
}

/**
 * Re-entry records — guidance staff with flag or headteacher.
 */
export async function authorizeReEntryAccess(request) {
  const portal = await authorizeGuidancePortal(request)
  if (portal.ok) {
    if (!portal.assignment?.canManageReEntry) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Re-entry records require explicit permission from the headteacher' },
          { status: 403 }
        ),
      }
    }
    return { ...portal, canManageReEntry: true }
  }

  const head = await authorizeGuidanceHead(request)
  if (head.ok) return { ...head, assignment: null, canManageReEntry: true }
  return portal
}

/**
 * Throws ApiError when the user cannot manage career guidance content.
 */
export async function requireCareerGuidanceManager(user, schoolId) {
  if (isSchoolAdminOrHead(user)) return
  const allowed = await canUserManageCareerGuidance(prisma, user, schoolId)
  if (!allowed) throw new ApiError('Forbidden', 403)
}

/**
 * Whether the user may list inactive career resources (?all=1).
 */
export async function canViewInactiveCareerResources(user, schoolId) {
  if (isSchoolAdminOrHead(user)) return true
  return canUserManageCareerGuidance(prisma, user, schoolId)
}

export const GUIDANCE_CASE_STATUSES = new Set(['OPEN', 'CLOSED', 'REFERRED'])

export const GUIDANCE_TERMLY_SCOPES = new Set(['ALL', 'JUNIOR', 'SENIOR'])
