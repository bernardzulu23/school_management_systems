export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  canCreateSBATask,
  validateZambianContext,
  getTermWeight,
} from '@/lib/middleware/ecz-validation'
import { generateEczRubricCriteria, criteriaToPrismaCreate } from '@/lib/ecz/ecz-rubric-builder'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'

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
  const formLevel = Number(body.formLevel)
  const formCheck = canCreateSBATask(formLevel)
  if (!formCheck.allowed) throw new ApiError(formCheck.reason, 400)

  const subjectId = String(body.subjectId || '').trim()
  const classId = body.classId ? String(body.classId).trim() : null
  const title = String(body.title || body.quizTitle || 'End of Term Test').trim()
  const term = Number(body.term)
  const questions = Array.isArray(body.questions) ? body.questions : []

  if (!subjectId) throw new ApiError('subjectId is required', 400)
  if (!Number.isFinite(term) || term < 1 || term > 3) {
    throw new ApiError('term (1–3) is required', 400)
  }
  if (!questions.length) throw new ApiError('questions array is required', 400)

  const context = String(body.context || questions[0]?.question || '').trim()
  const contextCheck = validateZambianContext(context)
  if (!contextCheck.valid) throw new ApiError(contextCheck.error, 400)

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } })
  if (!subject) throw new ApiError('Subject not found', 404)

  const assessment = await prisma.eczAssessment.create({
    data: {
      schoolId,
      subjectId,
      classId,
      component: 'SBA_TASK',
      formLevel,
      title,
      type: 'End of term test',
      context,
      maxMarks: 40,
      createdBy: auth.user.id,
      status: 'DRAFT',
      term,
      academicYear: String(body.academicYear || new Date().getFullYear()),
      termWeight: getTermWeight(term),
      generatedByAI: Boolean(body.generatedByAI),
    },
    include: { subject: true, class: true },
  })

  await prisma.eczRubric.create({
    data: {
      assessmentId: assessment.id,
      criteria: {
        create: criteriaToPrismaCreate(
          generateEczRubricCriteria({
            subjectName: subject.name,
            taskType: 'End of term test',
            numCriteria: 4,
            title,
            description: context,
          })
        ),
      },
    },
  })

  await prisma.eczAssessmentItem.createMany({
    data: questions.map((q, idx) => ({
      assessmentId: assessment.id,
      questionNumber: idx + 1,
      content: String(q.question || q.content || ''),
      markAllocation: Number(q.marks) || Math.floor(40 / questions.length),
      commandTerm: q.commandTerm ? String(q.commandTerm) : null,
      expectedAnswer: q.answer ? String(q.answer) : null,
      markingGuidance: q.explanation ? String(q.explanation) : null,
      bloomsLevel: q.bloomsLevel ? String(q.bloomsLevel) : null,
      zambiContext: true,
    })),
  })

  return NextResponse.json(
    {
      success: true,
      message: 'Quiz promoted to SBA End of Term Test (40 marks)',
      data: assessment,
    },
    { status: 201 }
  )
})
