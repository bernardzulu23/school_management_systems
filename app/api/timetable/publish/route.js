import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'

import { validateDraftEntriesForPublish } from '@/lib/timetable/validateDraftEntries'
import { rescanAndPersistDraftMeta } from '@/lib/timetable/conflictAudit'
import { syncClassActiveFlags } from '@/lib/timetable/getActiveClasses'
import { promoteDraftTimetableToPublished } from '@/lib/timetable/promoteDraftToPublished'
import { timetableExcludeConflictResponse } from '@/lib/timetable/excludeConstraintError'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

export const dynamic = 'force-dynamic'

export const POST = withErrorHandler(async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin'].includes(role)) {
    return NextResponse.json(
      { error: 'Only school administrators can publish the master timetable' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const term = safeQueryString(body?.term, { defaultValue: 'Term 1', maxLength: 64 })
  const academicYear = safeQueryString(body?.academicYear, {
    defaultValue: String(new Date().getFullYear()),
    maxLength: 16,
  })

  const draftCount = await prisma.timetableAllocationEntry.count({
    where: { schoolId, term, academicYear, status: 'draft' },
  })

  if (draftCount === 0) {
    return NextResponse.json(
      {
        error:
          'No draft timetable to publish. Generate a timetable and save the draft to the database first.',
      },
      { status: 400 }
    )
  }

  const validation = await validateDraftEntriesForPublish(prisma, {
    schoolId,
    term,
    academicYear,
  })

  if (!validation.ok) {
    await rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear }).catch(() => {})
    if (validation.code === 'NO_DRAFT') {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    return NextResponse.json(
      {
        error:
          'Cannot publish: draft timetable has hard conflicts. Fix conflicts before publishing.',
        hardConflicts: validation.hard,
        softConflicts: validation.soft,
        entryCount: validation.entryCount,
        conflictErrors: validation.hard.length,
        conflictCentreUrl: '/dashboard/headteacher/timetable/conflicts',
        code: 'PUBLISH_BLOCKED_BY_CONFLICTS',
      },
      { status: 422 }
    )
  }

  let result
  try {
    result = await promoteDraftTimetableToPublished(prisma, {
      schoolId,
      term,
      academicYear,
    })
  } catch (err) {
    const conflict = timetableExcludeConflictResponse(err)
    if (conflict) return conflict
    throw err
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
  }

  revalidateTag(`timetable-${schoolId}`)
  revalidateTag('timetable')

  await syncClassActiveFlags(prisma, schoolId, { term, academicYear }).catch(() => {})
  await rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear }).catch(() => {})

  return NextResponse.json({
    success: true,
    message: 'Timetable published',
    published: result.published,
    replacedPublished: result.deletedPublished,
    term,
    academicYear,
  })
})
