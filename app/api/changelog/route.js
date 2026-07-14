/**
 * GET /api/changelog — read-only system activity trail.
 * No POST/PATCH/DELETE — ChangeLogEntry is append-only.
 */
import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { listChangeLogEntries, listChangeLogActors, knownModules } from '@/lib/changelog/list'
import { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULE_LABELS } from '@/lib/changelog/constants'
import { prisma } from '@/lib/prisma'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const role = String(auth.user?.role || '').toLowerCase()
  const isLeadership = roleCheck(auth.user, [
    'ADMIN',
    'admin',
    'administrator',
    'headteacher',
    'superadmin',
  ])
  const isHod = role === 'hod'

  if (!isLeadership && !isHod) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const metaOnly = searchParams.get('meta') === '1'

  let departmentId = null
  if (isHod && !isLeadership) {
    const hod = await prisma.headOfDepartment.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { id: true, department: true },
    })
    if (!hod) return NextResponse.json({ error: 'HOD profile required' }, { status: 403 })
    departmentId = hod.id
  }

  if (metaOnly) {
    const actors = await listChangeLogActors(schoolId)
    return NextResponse.json({
      modules: knownModules().map((m) => ({
        id: m,
        label: CHANGE_LOG_MODULE_LABELS[m] || m,
      })),
      actions: Object.values(CHANGE_LOG_ACTIONS),
      actors: isLeadership ? actors : [],
      scope: isHod && !isLeadership ? 'department' : 'school',
    })
  }

  const { entries, nextCursor } = await listChangeLogEntries({
    schoolId,
    from: searchParams.get('from'),
    to: searchParams.get('to'),
    actorUserId: isLeadership ? safeStringId(searchParams.get('actorUserId')) : null,
    module: safeQueryString(searchParams.get('module'), { maxLength: 64 }) || null,
    entityType: safeQueryString(searchParams.get('entityType'), { maxLength: 64 }) || null,
    action: safeQueryString(searchParams.get('action'), { maxLength: 32 }) || null,
    departmentId:
      isHod && !isLeadership ? departmentId : safeStringId(searchParams.get('departmentId')),
    q: safeQueryString(searchParams.get('q'), { maxLength: 120 }) || null,
    take: Number(searchParams.get('take')) || 50,
    cursor: safeStringId(searchParams.get('cursor')),
  })

  return NextResponse.json({
    entries,
    nextCursor,
    scope: isHod && !isLeadership ? 'department' : 'school',
  })
})
