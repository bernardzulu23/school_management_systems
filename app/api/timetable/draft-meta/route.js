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
  updateIgnoredDraftAuditKeys,
  shrinkSummaryForIgnored,
} from '@/lib/timetable/conflictAudit'

import {
  canViewTimetableDraft,
  canManageTimetableDraft,
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
    const meta = await getDraftConflictMeta(prisma, { schoolId, term, academicYear })
    const shrunk = shrinkSummaryForIgnored(summary, meta?.ignoredAuditKeys)
    const payload = {
      term,
      academicYear,
      conflictCount: shrunk.totalConflicts,
      conflictErrors: shrunk.errorCount,
      conflictWarnings: shrunk.warningCount,
      missingPeriodsCount: shrunk.missingPeriodsCount,
      canPublish: shrunk.canPublish,
      lastScannedAt: shrunk.scannedAt,
      ignoredAuditKeys: meta?.ignoredAuditKeys ?? [],
      ...(isHod ? {} : { conflictSummary: (shrunk.conflicts || []).slice(0, 20) }),
    }
    return NextResponse.json(payload)
  }

  const [meta, draftCount, publishedCount] = await Promise.all([
    getDraftConflictMeta(prisma, { schoolId, term, academicYear }),
    prisma.timetableAllocationEntry.count({
      where: { schoolId, term, academicYear, status: 'draft' },
    }),
    prisma.timetableAllocationEntry.count({
      where: { schoolId, term, academicYear, status: 'published' },
    }),
  ])

  return NextResponse.json({
    ...formatDraftMetaResponse(meta, { term, academicYear, includeSummary: !isHod }),
    draftCount,
    publishedCount,
  })
})

/**
 * PATCH /api/timetable/draft-meta — dismiss or restore server audit rows.
 * Body: { term, academicYear, auditKeys: string[], mode?: 'add'|'remove'|'clear' }
 */
export const PATCH = withErrorHandler(async function PATCH(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageTimetableDraft(user)) return timetableForbiddenResponse()

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const body = await req.json().catch(() => ({}))
  const term = safeQueryString(body.term, { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(body.academicYear, {
    defaultValue: String(new Date().getFullYear()),
  })
  const mode = ['add', 'remove', 'clear'].includes(body.mode) ? body.mode : 'add'
  const auditKeys = Array.isArray(body.auditKeys)
    ? body.auditKeys.map((k) => String(k || '').trim()).filter(Boolean)
    : body.auditKey
      ? [String(body.auditKey).trim()]
      : []

  if (mode !== 'clear' && auditKeys.length === 0) {
    return NextResponse.json({ error: 'auditKey or auditKeys required' }, { status: 400 })
  }

  const result = await updateIgnoredDraftAuditKeys(prisma, {
    schoolId,
    term,
    academicYear,
    auditKeys,
    mode,
  })

  return NextResponse.json({
    success: true,
    ignoredAuditKeys: result.ignoredAuditKeys,
    conflictCount: result.summary.totalConflicts,
    conflictErrors: result.summary.errorCount,
    conflictWarnings: result.summary.warningCount,
    missingPeriodsCount: result.summary.missingPeriodsCount,
    canPublish: result.summary.canPublish,
    conflictSummary: (result.summary.conflicts || []).slice(0, 20),
  })
})
