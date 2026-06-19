export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import {
  getDraftConflictMeta,
  formatDraftMetaResponse,
  rescanAndPersistDraftMeta,
} from '@/lib/timetable/conflictAudit'

const READ_ROLES = new Set(['headteacher', 'administrator', 'admin', 'superadmin', 'hod'])

/**
 * GET /api/timetable/draft-meta?term=Term+1&academicYear=2026&refresh=false
 * Lightweight read of TimetableDraftMeta (no full rescan unless refresh=true).
 */
export async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!READ_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const { searchParams } = new URL(req.url)
  const term = String(searchParams.get('term') || 'Term 1').trim()
  const academicYear = String(searchParams.get('academicYear') || new Date().getFullYear()).trim()
  const refresh = searchParams.get('refresh') === 'true'
  const isHod = role === 'hod'

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
}
