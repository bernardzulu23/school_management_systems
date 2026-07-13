export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/middleware/auth'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
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
 * POST /api/timetable/conflicts/seed-test
 * Dev/helper: runs the real draft conflict audit for the caller's school
 * (same source of truth as GET /api/timetable/conflicts) and persists draft meta.
 * In production this is blocked — use GET /api/timetable/conflicts instead.
 */
export const POST = withErrorHandler(async function POST(req) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        error: 'Dev only',
        message: 'Use GET /api/timetable/conflicts in production',
      },
      { status: 403 }
    )
  }

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

  const body = await req.json().catch(() => ({}))
  const term = safeQueryString(body?.term, { defaultValue: 'Term 1', maxLength: 64 })
  const academicYear = safeQueryString(body?.academicYear, {
    defaultValue: String(new Date().getFullYear()),
    maxLength: 16,
  })

  const summary = await auditDraftTimetable(prisma, { schoolId, term, academicYear })

  if (summary.entryCount > 0) {
    await persistDraftConflictMeta(prisma, { schoolId, term, academicYear, summary })
  }

  const meta = await getDraftConflictMeta(prisma, { schoolId, term, academicYear })
  const ignored = parseIgnoredAuditKeys(meta?.ignoredAuditKeys)
  return NextResponse.json({
    ...shrinkSummaryForIgnored(summary, ignored),
    source: 'live-audit',
  })
})
