/**
 * Mobile mirror of web dashboardRouteAuth / role gates.
 * Staff companion app — students are never admitted.
 */

export function normalizeRoleKey(role: string | undefined | null): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const STAFF_ROLE_KEYS = new Set(
  [
    'headteacher',
    'admin',
    'administrator',
    'schooladministrator',
    'schooladmin',
    'principal',
    'headmaster',
    'superadmin',
    'hod',
    'headofdepartment',
    'deputyheadteacher',
    'deputyhead',
    'seniorteacher',
    'guidance',
    'guidanceteacher',
    'teacher',
    'classteacher',
  ].map(normalizeRoleKey)
)

export function isStaffRole(role: string | undefined | null): boolean {
  const key = normalizeRoleKey(role)
  return Boolean(key) && STAFF_ROLE_KEYS.has(key)
}

export function isStudentRole(role: string | undefined | null): boolean {
  return normalizeRoleKey(role) === 'student'
}

/** Routes reserved for student portal — blocked in the staff mobile app. */
export function isStudentOnlyPath(segments: string[]): boolean {
  return segments[0] === 'student'
}

/** Teacher-only feature areas in this companion app. */
export function isStaffFeaturePath(segments: string[]): boolean {
  const root = segments[0]
  return root === 'attendance' || root === 'scores' || root === 'lesson-plans' || root === '(tabs)'
}
