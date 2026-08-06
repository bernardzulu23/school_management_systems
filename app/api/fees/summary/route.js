export const dynamic = 'force-dynamic'

import { withApiHandler, apiOk } from '@/lib/middleware/withApiHandler'
import { assertFeeManagementAllowed } from '@/lib/school/feeManagementAccess'
import { getFeeSummary } from '@/lib/fees/summary'

/**
 * GET /api/fees/summary — Phase 3 example (fees domain).
 * Stack: auth → tenant → ADMIN/headteacher → fee-management → ownership after-hook.
 */
export const GET = withApiHandler(
  async ({ schoolId }) => {
    const summary = await getFeeSummary(schoolId)
    return apiOk(summary)
  },
  {
    roles: ['ADMIN', 'headteacher'],
    feature: 'fee-management',
    after: async ({ schoolId }) => assertFeeManagementAllowed(schoolId),
  }
)
