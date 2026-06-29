export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeStringId } from '@/lib/security/safeQueryValue'

function buildMarkingScheme(assessment) {
  const lines = []
  lines.push(`MARKING SCHEME — ${assessment.title}`)
  lines.push(`Subject: ${assessment.subject?.name || ''} | Form ${assessment.formLevel}`)
  lines.push(`Component: ${assessment.component} | Max marks: ${assessment.maxMarks}`)
  lines.push('')

  if (assessment.context) {
    lines.push('CONTEXT')
    lines.push(assessment.context)
    lines.push('')
  }

  if (assessment.rubric?.criteria?.length) {
    lines.push('RUBRIC CRITERIA')
    for (const c of assessment.rubric.criteria) {
      lines.push(`- ${c.name} (${c.maxPoints} marks): ${c.descriptor || ''}`)
      if (c.excellent) lines.push(`  Excellent (4): ${c.excellent}`)
      if (c.good) lines.push(`  Good (3): ${c.good}`)
      if (c.fair) lines.push(`  Fair (2): ${c.fair}`)
      if (c.needsImprovement) lines.push(`  Needs improvement (1): ${c.needsImprovement}`)
    }
    lines.push('')
  }

  if (assessment.items?.length) {
    lines.push('EXAM SUB-QUESTIONS')
    for (const item of assessment.items) {
      const term = item.commandTerm ? `[${item.commandTerm}] ` : ''
      lines.push(`${item.questionNumber}. ${term}${item.content} (${item.markAllocation} marks)`)
      if (item.expectedAnswer) lines.push(`   Model answer: ${item.expectedAnswer}`)
      if (item.markingGuidance) lines.push(`   Guidance: ${item.markingGuidance}`)
    }
  }

  return lines.join('\n')
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    throw new ApiError(staffRoleDeniedMessage(auth.user?.role), 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const body = await request.json().catch(() => ({}))
  const assessmentId = safeStringId(body.assessmentId)
  if (!assessmentId) throw new ApiError('assessmentId is required', 400)

  const assessment = await prisma.eczAssessment.findFirst({
    where: { id: assessmentId, schoolId },
    include: {
      subject: true,
      rubric: { include: { criteria: true } },
      items: { orderBy: { questionNumber: 'asc' } },
    },
  })
  if (!assessment) throw new ApiError('Assessment not found', 404)

  const scheme = buildMarkingScheme(assessment)

  return NextResponse.json({
    success: true,
    data: { markingScheme: scheme, assessmentId },
  })
})
