export const dynamic = 'force-dynamic'

import { z } from 'zod'
import prisma from '@/lib/prisma'
import { withApiHandler, apiOk } from '@/lib/middleware/withApiHandler'
import { assertSecondaryGradingForContext } from '@/lib/school/gradingAccess'
import { canCreateStudentResultCards, listStudentsWithResults } from '@/lib/results/resultCardData'
import { ApiError } from '@/lib/middleware/errorHandler'

const QuerySchema = z.object({
  q: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

/**
 * GET /api/dashboard/results/cards — students with entered results (admin result-card picker).
 */
export const GET = withApiHandler(
  async ({ user, schoolId, query }) => {
    if (!canCreateStudentResultCards(user)) {
      throw new ApiError('Only school admins can create student result cards', 403)
    }
    await assertSecondaryGradingForContext(schoolId, { prismaClient: prisma })

    const students = await listStudentsWithResults({
      prisma,
      schoolId,
      q: query.q,
      limit: query.limit,
    })

    return apiOk({ students })
  },
  {
    roles: canCreateStudentResultCards,
    feature: 'basic-results',
    query: QuerySchema,
  }
)
