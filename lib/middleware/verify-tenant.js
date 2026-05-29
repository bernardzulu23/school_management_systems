/**
 * Tenant verification helpers (defence-in-depth on top of RLS + resolveAuthenticatedSchoolId).
 *
 * These guard against the three OWASP multi-tenant attack vectors:
 *   1. Cross-tenant data leakage — School A reads School B's data
 *   2. Tenant impersonation     — attacker forges a schoolId in the request
 *   3. Privilege escalation     — a user claims a role/school they don't own
 *
 * The single source of truth for a tenant is the authenticated user's own
 * schoolId (from the verified JWT / DB record) — NEVER a value taken from the
 * request body, query string, or a client-supplied header.
 *
 * Platform sessions (isPlatform === true with a superadmin role) are the only
 * controlled cross-tenant bypass. They mirror lib/middleware/auth.ts.
 *
 * USAGE:
 *   const { schoolId, error } = verifyTenant(user, requestedSchoolId)
 *   if (error) return secureJson({ error }, { status: 403 }, request)
 */

const SUPERADMIN_ROLE = 'superadmin'

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
}

/**
 * Whether the session is a controlled cross-tenant platform session.
 * Matches isPlatformSession() in lib/middleware/auth.ts.
 * @param {{ isPlatform?: boolean, role?: string } | null | undefined} user
 */
export function isPlatformSession(user) {
  return Boolean(user?.isPlatform) && normalizeRole(user?.role) === SUPERADMIN_ROLE
}

/**
 * Verify that the authenticated user may act on `requestedSchoolId`.
 *
 * @param {{ schoolId?: string|null, role?: string, isPlatform?: boolean }} authenticatedUser
 * @param {string|null|undefined} requestedSchoolId - schoolId taken from a route param/query.
 *        Pass null/undefined when there is no explicit target (we fall back to the user's own).
 * @returns {{ schoolId: string|null, error: string|null }}
 */
export function verifyTenant(authenticatedUser, requestedSchoolId) {
  if (!authenticatedUser) {
    return { schoolId: null, error: 'Authentication required' }
  }

  const userSchoolId = authenticatedUser.schoolId ? String(authenticatedUser.schoolId) : null
  const requested =
    requestedSchoolId === null || requestedSchoolId === undefined ? null : String(requestedSchoolId)

  // Controlled bypass: platform admins may target any school.
  if (isPlatformSession(authenticatedUser)) {
    return { schoolId: requested || userSchoolId, error: null }
  }

  // Every non-platform user MUST be bound to a school.
  if (!userSchoolId) {
    return { schoolId: null, error: 'Access denied — no school is associated with your account' }
  }

  // No explicit target → scope to the user's own school (the safe default).
  if (!requested) {
    return { schoolId: userSchoolId, error: null }
  }

  // Explicit target must match the user's own school.
  if (requested !== userSchoolId) {
    return { schoolId: null, error: 'Access denied — your account belongs to a different school' }
  }

  return { schoolId: userSchoolId, error: null }
}

/**
 * Extract and verify schoolId from route params + the authenticated user.
 * Use in routes that have a [schoolId] segment in the URL path.
 *
 * @param {{ schoolId?: string|null, role?: string, isPlatform?: boolean }} user
 * @param {{ schoolId?: string } | null} params
 */
export function getVerifiedSchoolId(user, params) {
  const requestedSchoolId = params?.schoolId ?? null
  return verifyTenant(user, requestedSchoolId)
}

/**
 * Defence-in-depth assertion for object-level reads/writes: confirm a record
 * that was fetched actually belongs to the caller's tenant. Use after loading a
 * record by id to prevent IDOR-style cross-tenant access.
 *
 * @param {{ schoolId?: string|null, role?: string, isPlatform?: boolean }} user
 * @param {string|null|undefined} recordSchoolId - the schoolId stored on the fetched record.
 * @returns {boolean} true when access is allowed.
 */
export function assertSameTenant(user, recordSchoolId) {
  if (!user) return false
  if (isPlatformSession(user)) return true
  const userSchoolId = user.schoolId ? String(user.schoolId) : null
  if (!userSchoolId || recordSchoolId === null || recordSchoolId === undefined) return false
  return String(recordSchoolId) === userSchoolId
}
