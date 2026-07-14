export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import {
  auditDraftTimetable,
  persistDraftConflictMeta,
  getDraftConflictMeta,
  parseIgnoredAuditKeys,
  shrinkSummaryForIgnored,
} from '@/lib/timetable/conflictAudit'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

const ALLOWED_ROLES = new Set(['headteacher', 'administrator', 'admin', 'superadmin', 'hod'])

/**
 * GET /api/timetable/conflicts?term=Term+1&academicYear=2026
 * Server-side draft audit (conflictAudit / validateTimetable). Issue types include ROOM_DOUBLE_BOOKED,
 * TEACHER_CLASS_SUBJECT_SPLIT, TEACHER_CLASS_RETURN_TOO_SOON, plus classic double-book / missing-period / workload hits.
 */
export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const { searchParams } = new URL(req.url)
  const term = safeQueryString(searchParams.get('term'), { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(searchParams.get('academicYear'), {
    defaultValue: String(new Date().getFullYear()),
  })

  const summary = await auditDraftTimetable(prisma, { schoolId, term, academicYear })

  if (summary.entryCount > 0) {
    await persistDraftConflictMeta(prisma, { schoolId, term, academicYear, summary })
  }

  const meta = await getDraftConflictMeta(prisma, { schoolId, term, academicYear })
  const ignored = parseIgnoredAuditKeys(meta?.ignoredAuditKeys)
  return NextResponse.json(shrinkSummaryForIgnored(summary, ignored))
})
