export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { withSecureApi } from '@/lib/middleware/secureApi'
import {
  generateEczRubricCriteria,
  criteriaToPrismaCreate,
  rubricMaxPoints,
} from '@/lib/ecz/ecz-rubric-builder'

export const POST = withSecureApi(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: staffRoleDeniedMessage(auth.user?.role) }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const formLevel = Number(body.formLevel)
  if (formLevel === 4) {
    return NextResponse.json(
      { error: 'Form 4 — SBA rubrics are not administered. No SBA in the ECZ examination year.' },
      { status: 400 }
    )
  }

  const subjectId = body.subjectId ? String(body.subjectId) : ''
  let subjectName = String(body.subjectName || '').trim()

  if (subjectId && auth.user?.schoolId) {
    const subj = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId: auth.user.schoolId },
      select: { name: true },
    })
    if (subj) subjectName = subj.name
  }

  const criteria = generateEczRubricCriteria({
    subjectName,
    taskType: String(body.taskType || 'Project'),
    numCriteria: body.numCriteria ?? 4,
    title: String(body.title || ''),
    description: String(body.description || body.context || ''),
  })

  const prismaCriteria = criteriaToPrismaCreate(criteria)

  return NextResponse.json({
    success: true,
    data: {
      criteria: criteria.map((c) => ({
        name: c.name,
        description: c.description,
        excellent: c.excellent,
        good: c.good,
        fair: c.fair,
        needs_improvement: c.needs_improvement || c.needsImpr,
      })),
      prismaCreate: prismaCriteria,
      maxPoints: rubricMaxPoints(criteria.length),
      meta: {
        subject: subjectName,
        formLevel: body.formLevel,
        taskType: body.taskType,
        title: body.title,
      },
    },
  })
})
