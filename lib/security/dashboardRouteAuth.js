/**
 * Server-side dashboard path → role gates (BOLA / privilege escalation prevention).
 * Mirrors lib/middleware/auth.ts ROLE_ALIASES using the same roleKey normalization as proxy.js.
 */

export function normalizeRoleKey(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const ROLE_ALIASES = {
  ADMIN: [
    'headteacher',
    'admin',
    'administrator',
    'school administrator',
    'school admin',
    'schooladministrator',
    'school_admin',
    'school-admin',
    'principal',
    'head teacher',
    'head-teacher',
    'headmaster',
    'school principal',
    'superadmin',
  ],
  HOD: ['hod', 'head of department', 'head-of-department', 'department head', 'dept head'],
  DEPUTY: [
    'deputyheadteacher',
    'deputyhead',
    'deputy head',
    'deputy-head',
    'deputy_head',
    'deputy head teacher',
  ],
  SENIOR_TEACHER: ['seniorteacher', 'senior_teacher', 'senior-teacher', 'senior teacher'],
  GUIDANCE_TEACHER: [
    'guidance',
    'guidance teacher',
    'guidance-teacher',
    'guidance_teacher',
    'career guidance',
  ],
  TEACHER: ['teacher', 'class teacher', 'class-teacher', 'classteacher'],
  STUDENT: ['student'],
  PARENT: ['parent', 'guardian', 'parent/guardian', 'parent-guardian'],
}

function buildRoleKeySet(group) {
  const keys = new Set()
  for (const alias of ROLE_ALIASES[group] || []) {
    keys.add(normalizeRoleKey(alias))
  }
  keys.add(normalizeRoleKey(group))
  return keys
}

const ROLE_GROUP_KEYS = Object.fromEntries(
  Object.keys(ROLE_ALIASES).map((group) => [group, buildRoleKeySet(group)])
)

/** Longest prefix first so nested paths resolve to the most specific gate. */
const DASHBOARD_ROLE_GATES = [
  { prefix: '/dashboard/headteacher', groups: ['ADMIN'] },
  { prefix: '/dashboard/admin', groups: ['ADMIN'] },
  { prefix: '/dashboard/proprietor', groups: ['ADMIN'] },
  { prefix: '/dashboard/hod', groups: ['ADMIN', 'HOD'] },
  { prefix: '/dashboard/guidance', groups: ['ADMIN', 'GUIDANCE_TEACHER'] },
  {
    prefix: '/dashboard/sic',
    groups: ['ADMIN', 'HOD', 'TEACHER', 'SENIOR_TEACHER', 'DEPUTY'],
  },
  { prefix: '/dashboard/solo', groups: ['ADMIN', 'TEACHER'] },
  {
    prefix: '/dashboard/teacher',
    groups: ['ADMIN', 'HOD', 'TEACHER', 'DEPUTY', 'SENIOR_TEACHER', 'GUIDANCE_TEACHER'],
  },
  { prefix: '/dashboard/student', groups: ['STUDENT'] },
  { prefix: '/dashboard/parent', groups: ['PARENT'] },
].sort((a, b) => b.prefix.length - a.prefix.length)

/**
 * @param {string} pathname
 * @returns {{ prefix: string, groups: string[] } | null}
 */
export function matchDashboardRoleGate(pathname) {
  const path = String(pathname || '')
  return (
    DASHBOARD_ROLE_GATES.find(
      (gate) => path === gate.prefix || path.startsWith(`${gate.prefix}/`)
    ) || null
  )
}

/**
 * @param {string | undefined} role
 * @param {string[]} groups
 */
export function roleMatchesDashboardGroups(role, groups) {
  const roleKey = normalizeRoleKey(role)
  if (!roleKey) return false
  return groups.some((group) => ROLE_GROUP_KEYS[group]?.has(roleKey))
}
