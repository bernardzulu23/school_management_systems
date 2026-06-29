export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import {
  generateEczRubricCriteria,
  criteriaToPrismaCreate,
  rubricMaxPoints,
} from '@/lib/ecz/ecz-rubric-builder'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'

export const POST = withSecureHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: staffRoleDeniedMessage(auth.user?.role) }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const body = await request.json().catch(() => ({}))
  const formLevel = Number(body.formLevel)
  if (formLevel === 4) {
    return NextResponse.json(
      { error: 'Form 4 — SBA rubrics are not administered. No SBA in the ECZ examination year.' },
      { status: 400 }
    )
  }

  const subjectId = safeStringId(body.subjectId)
  let subjectName = safeQueryString(body.subjectName, { maxLength: 128 }) || ''

  if (subjectId) {
    const subj = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { name: true },
    })
    if (subj) subjectName = subj.name
  }

  const criteria = generateEczRubricCriteria({
    subjectName,
    taskType: safeQueryString(body.taskType, { defaultValue: 'Project' }),
    numCriteria: body.numCriteria ?? 4,
    title: safeQueryString(body.title, { defaultValue: '' }),
    description: safeQueryString(body.description || body.context, { defaultValue: '' }),
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
