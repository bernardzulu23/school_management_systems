export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import {
  getDraftConflictMeta,
  formatDraftMetaResponse,
  rescanAndPersistDraftMeta,
} from '@/lib/timetable/conflictAudit'

import {
  canViewTimetableDraft,
  timetableForbiddenResponse,
} from '@/lib/timetable/timetableRouteAuth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

/**
 * GET /api/timetable/draft-meta?term=Term+1&academicYear=2026&refresh=false
 * Lightweight read of TimetableDraftMeta (no full rescan unless refresh=true).
 */
export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canViewTimetableDraft(user)) return timetableForbiddenResponse()

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const { searchParams } = new URL(req.url)
  const term = safeQueryString(searchParams.get('term'), { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(searchParams.get('academicYear'), {
    defaultValue: String(new Date().getFullYear()),
  })
  const refresh = safeQueryString(searchParams.get('refresh')) === 'true'
  const isHod = roleCheck(user, ['HOD', 'hod'])

  if (refresh) {
    const summary = await rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear })
    const payload = {
      term,
      academicYear,
      conflictCount: summary.totalConflicts,
      conflictErrors: summary.errorCount,
      conflictWarnings: summary.warningCount,
      canPublish: summary.canPublish,
      lastScannedAt: summary.scannedAt,
      ...(isHod ? {} : { conflictSummary: (summary.conflicts || []).slice(0, 20) }),
    }
    return NextResponse.json(payload)
  }

  const meta = await getDraftConflictMeta(prisma, { schoolId, term, academicYear })
  return NextResponse.json(
    formatDraftMetaResponse(meta, { term, academicYear, includeSummary: !isHod })
  )
})
