import prisma from '@/lib/prisma'
import { getActiveGuidanceAssignment } from '@/lib/guidance/guidanceAccess'

/**
 * Resolve active guidance assignment using the default Prisma client (server-only).
 */
export async function resolveGuidanceAssignmentForUser(userId, schoolId, db = prisma) {
  return getActiveGuidanceAssignment(db, userId, schoolId)
}
