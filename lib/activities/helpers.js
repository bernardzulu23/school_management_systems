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

export const ACTIVITY_TYPES = ['sport', 'club', 'event']

export function mapActivity(activity) {
  if (!activity) return null
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    date: activity.date ? activity.date.toISOString() : null,
    location: activity.location,
    type: activity.type,
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
