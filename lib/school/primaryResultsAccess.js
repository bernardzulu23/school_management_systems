import { ApiError } from '@/lib/middleware/errorHandler'
import { hasPrimaryClasses } from '@/lib/school/schoolTypeHelpers'
import prisma from '@/lib/prisma'

/**
 * Primary (or combined) schools only — for week 2 / week 7 / EOT results flows.
 */
export async function assertPrimaryResultsAccess(schoolId, { prismaClient } = {}) {
  const db = prismaClient || prisma
  const school = await db.school.findUnique({
    where: { id: String(schoolId || '') },
    select: { id: true, level: true },
  })
  if (!school) throw new ApiError('School not found', 404)
  if (!hasPrimaryClasses(school)) {
    const err = new ApiError('Primary results are only available for primary schools', 403)
    err.code = 'SCHOOL_LEVEL_RESTRICTED'
    err.featureId = 'primary-results'
    throw err
  }
  return school
}
