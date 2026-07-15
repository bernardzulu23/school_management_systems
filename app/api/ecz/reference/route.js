/**
 * GET /api/ecz/reference — ECZ competencies and CBC subject constructs (seeded data).
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { isEczStaff } from '@/lib/ecz/routeAuth'
import {
  ECZ_COMMAND_TERMS,
  ECZ_BLOOM_TARGETS,
  ECZ_SBA_TASK_TYPES,
  ECZ_ZAMBIAN_CONTEXTS,
} from '@/lib/ecz/ecz-reference-constants'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isEczStaff(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const [competencies, subjects] = await Promise.all([
    prisma.eczCompetency.findMany({
      ...(schoolId ? {} : {}),
      orderBy: { name: 'asc' },
      select: { id: true, name: true, descriptor: true, category: true },
      take: 500,
    }),
    prisma.eczSubjectConstruct.findMany({
      ...(schoolId ? {} : {}),
      orderBy: { subjectName: 'asc' },
      select: {
        id: true,
        subjectName: true,
        construct: true,
        elementsOfConstruct: true,
        sbaWeight: true,
        examWeight: true,
        hasMultipleChoice: true,
      },
      take: 500,
    }),
  ])

  return NextResponse.json({
    success: true,
    competencies,
    subjectConstructs: subjects,
    commandTerms: ECZ_COMMAND_TERMS,
    bloomTargets: ECZ_BLOOM_TARGETS,
    sbaTaskTypes: ECZ_SBA_TASK_TYPES,
    zambianContexts: ECZ_ZAMBIAN_CONTEXTS,
  })
})
