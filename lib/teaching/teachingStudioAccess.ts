/**
 * Staff roles allowed on /dashboard/teacher/teaching-studio (and related studio pages).
 * Matches the /dashboard/teacher proxy gate, including isHod / isSeniorTeacher claims.
 */
import { roleCheck, ROLE_GROUPS, type AppUser } from '@/lib/middleware/auth'

export function canAccessTeachingStudio(user: AppUser | null | undefined): boolean {
  if (!user) return false
  return roleCheck(user, ROLE_GROUPS.SCHOOL_STAFF)
}
