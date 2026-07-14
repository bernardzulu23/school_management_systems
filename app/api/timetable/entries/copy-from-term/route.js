export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import {
  copyTimetableFromPreviousTerm,
  resolvePreviousSeason,
} from '@/lib/timetable/copyFromPreviousTerm'
import {
  canManageTimetableDraft,
  timetableForbiddenResponse,
} from '@/lib/timetable/timetableRouteAuth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

/**
 * POST /api/timetable/entries/copy-from-term
 * Copy a previous term's timetable structure into a new draft for the target term.
 * Remaps times onto the current school bell schedule and allocation IDs for the target season.
 */
export const POST = withErrorHandler(async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageTimetableDraft(user)) return timetableForbiddenResponse()

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const body = await req.json().catch(() => ({}))
  const targetTerm = safeQueryString(body?.targetTerm || body?.term, {
    defaultValue: 'Term 1',
    maxLength: 64,
  })
  const targetAcademicYear = safeQueryString(body?.targetAcademicYear || body?.academicYear, {
    defaultValue: String(new Date().getFullYear()),
    maxLength: 16,
  })

  let sourceTerm = safeQueryString(body?.sourceTerm, { maxLength: 64 })
  let sourceAcademicYear = safeQueryString(body?.sourceAcademicYear, { maxLength: 16 })
  if (!sourceTerm || !sourceAcademicYear) {
    const prev = resolvePreviousSeason(targetTerm, targetAcademicYear)
    sourceTerm = sourceTerm || prev.term
    sourceAcademicYear = sourceAcademicYear || prev.academicYear
  }

  const sourceStatus = ['published', 'draft', 'auto'].includes(String(body?.sourceStatus || ''))
    ? String(body.sourceStatus)
    : 'auto'

  const result = await copyTimetableFromPreviousTerm(prisma, {
    schoolId,
    sourceTerm,
    sourceAcademicYear,
    targetTerm,
    targetAcademicYear,
    sourceStatus,
  })

  if (!result.success && !result.alreadyExists) {
    const status =
      result.code === 'NO_SOURCE'
        ? 404
        : result.code === 'TARGET_HAS_PUBLISHED' || result.code === 'NO_TARGET_ALLOCATIONS'
          ? 422
          : 400
    return NextResponse.json(
      { error: result.message, code: result.code || 'COPY_FAILED', ...result },
      { status }
    )
  }

  return NextResponse.json(result)
})
