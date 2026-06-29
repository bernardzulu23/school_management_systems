import { getServerAuthUser } from '@/lib/auth/serverSession'
import { roleCheck } from '@/lib/middleware/auth'
import prisma from '@/lib/prisma'
import { getSchoolFeaturesFromId } from '@/lib/middleware/schoolTypeGate'
import { getActiveGuidanceAssignment } from '@/lib/guidance/guidanceAccess'

/**
 * Server-side gate for /dashboard/guidance/* — verifies cookie session and active assignment.
 */
export async function assertGuidancePortalServerAccess() {
  const user = await getServerAuthUser()
  if (!user?.id || !user?.schoolId) {
    return { ok: false, redirectTo: '/login' }
  }

  const features = await getSchoolFeaturesFromId(user.schoolId)
  if (!features?.careerGuidance) {
    return { ok: false, redirectTo: '/dashboard/teacher' }
  }

  const assignment = await getActiveGuidanceAssignment(prisma, user.id, user.schoolId)
  if (!assignment) {
    return { ok: false, redirectTo: '/dashboard/teacher' }
  }

  return { ok: true, user, assignment }
}

/**
 * Server-side gate for headteacher guidance assignment UI.
 */
export async function assertGuidanceAssignmentAdminServerAccess() {
  const user = await getServerAuthUser()
  if (!user?.id || !user?.schoolId) {
    return { ok: false, redirectTo: '/login' }
  }

  if (!roleCheck(user, ['ADMIN', 'headteacher'])) {
    return { ok: false, redirectTo: '/dashboard/teacher' }
  }

  const features = await getSchoolFeaturesFromId(user.schoolId)
  if (!features?.careerGuidance) {
    return { ok: false, redirectTo: '/dashboard/headteacher' }
  }

  return { ok: true, user }
}
