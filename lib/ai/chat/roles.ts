/**
 * Maps live JWT/User.role strings → ChatUserRole (session openedAsRole).
 * Does not alter User.role (still a free-form String in Prisma).
 */
import { normalizeRole, roleCheck, type AppUser, isPlatformSession } from '@/lib/middleware/auth'
import type { ChatUserRole } from '@prisma/client'

export const CHAT_ENABLED_ROLES: ChatUserRole[] = [
  'HEADTEACHER',
  'HOD',
  'TEACHER',
  'SOLO_TEACHER',
  'PLATFORM_ADMIN',
]

export function mapUserToChatRole(
  user: AppUser | undefined,
  schoolType?: string | null
): ChatUserRole | null {
  if (!user) return null
  if (isPlatformSession(user)) return 'PLATFORM_ADMIN'

  if (roleCheck(user, ['ADMIN', 'headteacher', 'HEADTEACHER'])) return 'HEADTEACHER'
  if (roleCheck(user, ['HOD', 'hod'])) return 'HOD'

  if (roleCheck(user, ['TEACHER', 'teacher'])) {
    const solo = String(schoolType || '').toUpperCase() === 'INDIVIDUAL'
    return solo ? 'SOLO_TEACHER' : 'TEACHER'
  }

  if (roleCheck(user, ['STUDENT', 'student'])) return 'STUDENT'

  const raw = normalizeRole(user.role)
  if (raw === 'platform_admin' || raw === 'superadmin') return 'PLATFORM_ADMIN'
  return null
}

export function isChatRoleEnabled(role: ChatUserRole | null | undefined): boolean {
  if (!role) return false
  if (role === 'STUDENT') return false
  return CHAT_ENABLED_ROLES.includes(role)
}

export function rolesMatch(live: ChatUserRole, openedAs: ChatUserRole): boolean {
  return live === openedAs
}
