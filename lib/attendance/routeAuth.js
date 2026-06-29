import prisma from '@/lib/prisma'
import { ApiError } from '@/lib/middleware/errorHandler'
import {
  isStaffBypass,
  loadTeacherProfile,
  buildTeacherAssignmentCtx,
} from '@/lib/assignments/routeScope'

/**
 * Class IDs a teacher may access for attendance (TeachingAssignment + profile classes).
 */
export async function getTeacherAssignedClassIds(schoolId, user) {
  if (isStaffBypass(user)) return null

  const teacher = await loadTeacherProfile(user.id, schoolId)
  if (!teacher) throw new ApiError('Forbidden', 403)

  const ctx = buildTeacherAssignmentCtx(teacher)
  const classIds = new Set(ctx.allowedClassIds)
  for (const pair of ctx.assignmentPairs) {
    const [classId] = pair.split(':')
    if (classId) classIds.add(classId)
  }
  return [...classIds]
}

export async function assertTeacherMayAccessAttendanceClass({ schoolId, user, classId }) {
  if (isStaffBypass(user)) return
  const allowed = await getTeacherAssignedClassIds(schoolId, user)
  if (!allowed || !allowed.includes(String(classId))) {
    throw new ApiError('Not assigned to this class', 403)
  }
}

export async function filterSessionsForTeacher(sessions, schoolId, user) {
  if (isStaffBypass(user)) return sessions
  const allowed = await getTeacherAssignedClassIds(schoolId, user)
  if (!allowed) return sessions
  const set = new Set(allowed.map(String))
  return sessions.filter((s) => set.has(String(s.classId || s.class?.id || '')))
}
