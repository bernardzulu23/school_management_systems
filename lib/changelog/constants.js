/**
 * System-wide change log (Prompt 10).
 * Append-only — never update/delete entries from application code.
 * DB trigger also rejects UPDATE/DELETE on ChangeLogEntry.
 */

export const CHANGE_LOG_ACTIONS = Object.freeze({
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  RESTORED: 'restored',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RECORDED: 'recorded',
  OPENED: 'opened',
  CLOSED: 'closed',
  SENT: 'sent',
  LOGIN: 'login',
  OTHER: 'other',
})

export const CHANGE_LOG_MODULES = Object.freeze({
  TIMETABLE: 'timetable',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  USERS: 'users',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  ATTENDANCE: 'attendance',
  RESULTS: 'results',
  ASSESSMENTS: 'assessments',
  ECZ: 'ecz',
  FEES: 'fees',
  BILLING: 'billing',
  TRANSPORT: 'transport',
  HOSTEL: 'hostel',
  HOUSES: 'houses',
  GUIDANCE: 'guidance',
  HOD: 'hod',
  ALLOCATIONS: 'allocations',
  NOTIFICATIONS: 'notifications',
  SMS: 'sms',
  TEACHING: 'teaching',
  CREATIVE: 'creative',
  GOVERNMENT: 'government',
  AUTH: 'auth',
  PLATFORM: 'platform',
  OTHER: 'other',
})

/** Display title for module filter chips. */
export const CHANGE_LOG_MODULE_LABELS = Object.freeze({
  timetable: 'Timetable',
  students: 'Students',
  teachers: 'Teachers',
  users: 'Users',
  classes: 'Classes',
  subjects: 'Subjects',
  attendance: 'Attendance',
  results: 'Results',
  assessments: 'Assessments',
  ecz: 'ECZ',
  fees: 'Fees',
  billing: 'Billing',
  transport: 'Transport',
  hostel: 'Hostel',
  houses: 'Inter-house',
  guidance: 'Guidance',
  hod: 'HOD / Department',
  allocations: 'Allocations',
  notifications: 'Notifications',
  sms: 'SMS',
  teaching: 'Teaching',
  creative: 'Creative Teaching',
  government: 'Government',
  auth: 'Auth',
  platform: 'Platform',
  other: 'Other',
})

export function formatActorRole(role) {
  const r = String(role || '')
    .trim()
    .toLowerCase()
  const map = {
    headteacher: 'Headteacher',
    admin: 'Administrator',
    administrator: 'Administrator',
    hod: 'HOD',
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent',
    guidance: 'Guidance',
    deputy: 'Deputy',
    platform: 'Platform admin',
  }
  if (map[r]) return map[r]
  if (!r) return 'User'
  return r.charAt(0).toUpperCase() + r.slice(1)
}

/**
 * Build actor label: "Headteacher — Mwansa Phiri" or "HOD Sciences — Andrew Simwanza"
 * @param {{ name?: string|null, role?: string|null, department?: string|null }} actor
 */
export function buildActorLabel(actor = {}) {
  const name = String(actor.name || '').trim() || 'Unknown user'
  const role = formatActorRole(actor.role)
  const dept = String(actor.department || '').trim()
  if (role.toLowerCase() === 'hod' && dept) {
    return `HOD ${dept} — ${name}`
  }
  return `${role} — ${name}`
}

/**
 * Diff plain objects → list of changed field keys + before/after subsets.
 */
export function diffFields(before, after, { ignoreKeys = ['updatedAt', 'createdAt'] } = {}) {
  const b = before && typeof before === 'object' ? before : {}
  const a = after && typeof after === 'object' ? after : {}
  const keys = new Set([...Object.keys(b), ...Object.keys(a)])
  const changedFields = []
  const beforePart = {}
  const afterPart = {}
  for (const key of keys) {
    if (ignoreKeys.includes(key)) continue
    const bv = b[key]
    const av = a[key]
    if (JSON.stringify(bv) === JSON.stringify(av)) continue
    changedFields.push(key)
    if (bv !== undefined) beforePart[key] = bv
    if (av !== undefined) afterPart[key] = av
  }
  return { changedFields, before: beforePart, after: afterPart }
}
