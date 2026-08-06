export const dynamic = 'force-dynamic'

import { z } from 'zod'
import prisma from '@/lib/prisma'
import { withApiHandler, apiOk } from '@/lib/middleware/withApiHandler'
import { canAccessResultsOverview, fetchResultsOverview } from '@/lib/dashboard/resultsOverview'
import { assertSecondaryGradingForContext } from '@/lib/school/gradingAccess'

const ResultsOverviewQuerySchema = z.object({
  class: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  teacher: z.string().optional().default(''),
  resultType: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
})

/**
 * GET /api/dashboard/results — Phase 3 example (results domain).
 * Stack: auth → tenant → roles → feature basic-results → Zod query.
 */
export const GET = withApiHandler(
  async ({ user, schoolId, query }) => {
    await assertSecondaryGradingForContext(schoolId, { prismaClient: prisma })

    const data = await fetchResultsOverview({
      prisma,
      schoolId,
      user,
      className: String(query.class || '').trim(),
      subjectName: String(query.subject || '').trim(),
      teacherUserId: String(query.teacher || '').trim(),
      resultType: String(query.resultType || '').trim(),
      limit: query.limit,
    })

    return apiOk(data)
  },
  {
    roles: canAccessResultsOverview,
    feature: 'basic-results',
    query: ResultsOverviewQuerySchema,
  }
)
