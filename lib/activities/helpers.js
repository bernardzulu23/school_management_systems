import { roleCheck } from '@/lib/middleware/auth'

const STAFF = ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher']
const MANAGERS = ['ADMIN', 'headteacher', 'HOD', 'hod']

export function canManageActivities(user) {
  return roleCheck(user, STAFF)
}

export function canManageAnyActivity(user) {
  return roleCheck(user, MANAGERS)
}

export function canEditActivity(user, activity) {
  if (!activity) return false
  if (canManageAnyActivity(user)) return true
  return String(activity.organizerId) === String(user?.id)
}

/** Legacy + primary Inter-house extracurricular types. */
export const ACTIVITY_TYPES = [
  'sport',
  'club',
  'event',
  'sports',
  'preventive_maintenance',
  'clubs',
  'production_unit',
]

export const PRIMARY_HOUSE_ACTIVITY_TYPES = [
  'sports',
  'preventive_maintenance',
  'clubs',
  'production_unit',
]

export const PRIMARY_HOUSE_ACTIVITY_LABELS = {
  sports: 'Sports',
  preventive_maintenance: 'Preventive maintenance',
  clubs: 'Clubs',
  production_unit: 'Production unit',
}

export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const WEEK_DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export function normalizeScheduleDays(raw) {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(WEEK_DAYS)
  return [
    ...new Set(
      raw
        .map((d) =>
          String(d || '')
            .toLowerCase()
            .slice(0, 3)
        )
        .filter((d) => allowed.has(d))
    ),
  ]
}

export function normalizeActivityType(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (t === 'sport') return 'sports'
  if (t === 'club') return 'clubs'
  if (ACTIVITY_TYPES.includes(t)) return t
  return 'clubs'
}

export function mapActivity(activity) {
  if (!activity) return null
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    date: activity.date ? activity.date.toISOString() : null,
    location: activity.location,
    type: activity.type,
    scheduleDays: Array.isArray(activity.scheduleDays) ? activity.scheduleDays : [],
    isActive: activity.isActive,
    organizerId: activity.organizerId,
    organizer: activity.organizer
      ? { id: activity.organizer.id, name: activity.organizer.name }
      : null,
    participantCount: activity.participants?.length ?? activity._count?.participants ?? 0,
    participants: (activity.participants || []).map((p) => ({
      id: p.id,
      role: p.role,
      joinedAt: p.joinedAt?.toISOString?.() || p.joinedAt,
      studentId: p.studentId,
      userId: p.userId,
      student: p.student
        ? {
            id: p.student.id,
            name: p.student.name,
            class: p.student.class,
            exam_number: p.student.exam_number,
          }
        : null,
      user: p.user ? { id: p.user.id, name: p.user.name } : null,
    })),
    createdAt: activity.createdAt?.toISOString?.() || activity.createdAt,
    updatedAt: activity.updatedAt?.toISOString?.() || activity.updatedAt,
  }
}
