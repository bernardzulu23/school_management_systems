import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { secureJson } from '@/lib/security/api'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

/**
 * Resolve school for authenticated API routes.
 * JWT/DB user schoolId is the only source of truth — never fall back to another tenant.
 */
export async function resolveAuthenticatedSchoolId(request, authUser) {
  if (!authUser?.id) {
    return {
      ok: false,
      schoolId: null,
      response: secureJson(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
        request
      ),
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: String(authUser.id) },
    select: {
      id: true,
      schoolId: true,
      school: { select: { id: true, active: true, subdomain: true } },
    },
  })

  if (!dbUser?.schoolId || !dbUser.school?.active) {
    return {
      ok: false,
      schoolId: null,
      response: secureJson(
        { error: 'User or school not found', code: 'TENANT_NOT_FOUND' },
        { status: 403 },
        request
      ),
    }
  }

  const schoolId = dbUser.schoolId

  const tokenSchoolId = authUser.schoolId ? String(authUser.schoolId) : null
  if (tokenSchoolId && tokenSchoolId !== schoolId) {
    return {
      ok: false,
      schoolId: null,
      response: secureJson(
        {
          error: 'Session does not match your school. Please sign in again.',
          code: 'TENANT_TOKEN_MISMATCH',
        },
        { status: 403 },
        request
      ),
    }
  }

  const headerSchoolId = request.headers.get('x-school-id')
  if (headerSchoolId && String(headerSchoolId) !== schoolId) {
    return {
      ok: false,
      schoolId: null,
      response: secureJson(
        { error: 'Forbidden: school context mismatch', code: 'TENANT_HEADER_MISMATCH' },
        { status: 403 },
        request
      ),
    }
  }

  const requestSchoolId = await getSchoolIdFromRequest(request, null, {
    allowClientSchoolIdHeader: false,
    allowDevFirstSchoolFallback: false,
  })
  if (requestSchoolId && requestSchoolId !== schoolId) {
    return {
      ok: false,
      schoolId: null,
      response: secureJson(
        {
          error: 'Forbidden: subdomain does not match your school',
          code: 'TENANT_SUBDOMAIN_MISMATCH',
        },
        { status: 403 },
        request
      ),
    }
  }

  return { ok: true, schoolId, response: null }
}

/**
 * Unauthenticated / public routes (login, school/current, webhooks).
 */
export async function resolvePublicSchoolId(request, explicitSubdomain = null) {
  return getSchoolIdFromRequest(request, explicitSubdomain, {
    allowClientSchoolIdHeader: false,
    allowDevFirstSchoolFallback: false,
  })
}
