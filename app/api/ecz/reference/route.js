/**
 * GET /api/ecz/reference — ECZ competencies and CBC subject constructs (seeded data).
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/middleware/auth'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import {
  ECZ_COMMAND_TERMS,
  ECZ_BLOOM_TARGETS,
  ECZ_SBA_TASK_TYPES,
  ECZ_ZAMBIAN_CONTEXTS,
} from '@/lib/ecz/ecz-reference-constants'

export async function GET(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = String(user?.schoolId || '').trim()
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const [competencies, subjects] = await Promise.all([
    prisma.eczCompetency.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, descriptor: true, category: true },
    }),
    prisma.eczSubjectConstruct.findMany({
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
}
