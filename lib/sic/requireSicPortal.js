import { getServerAuthUser } from '@/lib/auth/serverSession'
import { roleCheck } from '@/lib/middleware/auth'
import prisma from '@/lib/prisma'
import { getActiveSicAssignment } from '@/lib/sic/sicAccess'

/**
 * Server-side gate for /dashboard/sic/* — cookie session + active SIC assignment.
 */
export async function assertSicPortalServerAccess() {
  const user = await getServerAuthUser()
  if (!user?.id || !user?.schoolId) {
    return { ok: false, redirectTo: '/login' }
  }

  const assignment = await getActiveSicAssignment(prisma, user.id, user.schoolId)
  if (!assignment) {
    return { ok: false, redirectTo: '/dashboard/teacher' }
  }

  return { ok: true, user, assignment }
}

export async function assertSicAssignAdminServerAccess() {
  const user = await getServerAuthUser()
  if (!user?.id || !user?.schoolId) {
    return { ok: false, redirectTo: '/login' }
  }
  if (!roleCheck(user, ['ADMIN', 'headteacher'])) {
    return { ok: false, redirectTo: '/dashboard/teacher' }
  }
  return { ok: true, user }
}
