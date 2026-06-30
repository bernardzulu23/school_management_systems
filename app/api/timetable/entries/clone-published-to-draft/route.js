export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { clonePublishedEntriesToDraft } from '@/lib/timetable/clonePublishedToDraft'
import {
  canManageTimetableDraft,
  timetableForbiddenResponse,
} from '@/lib/timetable/timetableRouteAuth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

/**
 * POST /api/timetable/entries/clone-published-to-draft
 * Create an editable draft by copying the published timetable for a term.
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
  const term = safeQueryString(body?.term, { defaultValue: 'Term 1', maxLength: 64 })
  const academicYear = safeQueryString(body?.academicYear, {
    defaultValue: String(new Date().getFullYear()),
    maxLength: 16,
  })

  const result = await clonePublishedEntriesToDraft(prisma, { schoolId, term, academicYear })

  if (!result.success) {
    return NextResponse.json(
      { error: result.message, code: result.code || 'CLONE_FAILED' },
      { status: result.code === 'NO_PUBLISHED' ? 404 : 400 }
    )
  }

  return NextResponse.json(result)
})
