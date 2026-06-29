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
import { safeRouteParam, safeStringId } from '@/lib/security/safeQueryValue'

export const POST = withErrorHandler(async function POST(request, { params }) {
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

  const exemplarId = await safeRouteParam(params, 'id')
  if (!exemplarId) throw new ApiError('Exemplar id required', 400)

  const body = await request.json().catch(() => ({}))
  const subjectId = safeStringId(body.subjectId)
  const classId = body.classId ? safeStringId(body.classId) : null
  const formLevel = Number(body.formLevel)
  const term = body.term != null ? Number(body.term) : null

  if (!subjectId) throw new ApiError('subjectId is required', 400)
  if (!Number.isFinite(formLevel)) throw new ApiError('formLevel is required', 400)

  const exemplar = await prisma.eczExemplar.findUnique({ where: { id: exemplarId } })
  if (!exemplar) throw new ApiError('Exemplar not found', 404)

  const formCheck = canCreateSBATask(formLevel)
  if (exemplar.band === 'sba_task' && !formCheck.allowed) {
    throw new ApiError(formCheck.reason, 400)
  }

  const contextCheck = validateZambianContext(exemplar.context)
  if (!contextCheck.valid) throw new ApiError(contextCheck.error, 400)

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } })
  if (!subject) throw new ApiError('Subject not found', 404)

  const component = exemplar.band === 'exam_scenario' ? 'FINAL_EXAMINATION' : 'SBA_TASK'
  const taskType =
    exemplar.taskType || exemplar.band === 'exam_scenario' ? 'End of term test' : 'Project'

  const assessment = await prisma.eczAssessment.create({
    data: {
      schoolId,
      subjectId,
      classId,
      component,
      formLevel,
      title: exemplar.title,
      description: exemplar.task || null,
      type: taskType,
      context: exemplar.context,
      materialsProvided: Array.isArray(exemplar.materials) ? exemplar.materials : [],
      maxMarks: 40,
      createdBy: auth.user.id,
      status: 'DRAFT',
      term,
      academicYear:
        body.academicYear != null ? String(body.academicYear) : String(new Date().getFullYear()),
      termWeight: term != null ? getTermWeight(term) : null,
      instructions: exemplar.task || null,
      demonstration: exemplar.demonstration || null,
      exemplarId: exemplar.id,
    },
    include: { subject: true, class: true },
  })

  if (exemplar.band === 'sba_task' && exemplar.rubricJson) {
    const criteria = Array.isArray(exemplar.rubricJson?.criteria)
      ? exemplar.rubricJson.criteria
      : generateEczRubricCriteria({
          subjectName: subject.name,
          taskType: taskType,
          numCriteria: 4,
          title: exemplar.title,
          description: exemplar.context,
        })
    await prisma.eczRubric.create({
      data: {
        assessmentId: assessment.id,
        criteria: { create: criteriaToPrismaCreate(criteria) },
      },
    })
  }

  if (exemplar.band === 'exam_scenario' && Array.isArray(exemplar.examSubQuestionsJson)) {
    await prisma.eczAssessmentItem.createMany({
      data: exemplar.examSubQuestionsJson.map((sq, idx) => ({
        assessmentId: assessment.id,
        questionNumber: idx + 1,
        content: String(sq.question || sq.content || ''),
        markAllocation: Number(sq.marks) || 2,
        commandTerm: sq.commandTerm ? String(sq.commandTerm) : null,
        expectedAnswer: sq.modelAnswer ? String(sq.modelAnswer) : null,
        bloomsLevel: sq.bloomsLevel ? String(sq.bloomsLevel) : null,
        zambiContext: true,
      })),
    })
  }

  return NextResponse.json(
    { success: true, message: 'Assessment cloned from exemplar', data: assessment },
    { status: 201 }
  )
})
