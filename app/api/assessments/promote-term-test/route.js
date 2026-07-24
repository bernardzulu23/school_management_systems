/**
 * Promote a validated quiz / scheme paper to an ECZ SBA mid-term or end-of-term test.
 * Secondary schools only (ECZ SBA path).
 */

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
import { safeStringId } from '@/lib/security/safeQueryValue'

function normalizeSlot(raw) {
  const s = String(raw || 'end_of_term')
    .toLowerCase()
    .replace(/-/g, '_')
  if (s === 'mid_term' || s === 'midterm') return 'mid_term'
  return 'end_of_term'
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
  const slot = normalizeSlot(body.slot)
  const isMid = slot === 'mid_term'
  const taskType = isMid ? 'Mid-term test' : 'End of term test'
  const defaultTitle = isMid ? 'Mid-term Assessment' : 'End of Term Test'

  const formLevel = Number(body.formLevel)
  const formCheck = canCreateSBATask(formLevel)
  if (!formCheck.allowed) throw new ApiError(formCheck.reason, 400)

  const subjectId = safeStringId(body.subjectId)
  const classId = safeStringId(body.classId)
  const sourceAssessmentId = safeStringId(body.sourceAssessmentId || body.assessmentId)
  const schemeId = safeStringId(body.schemeId)
  const title = String(body.title || body.quizTitle || defaultTitle).trim()
  const term = Number(body.term)
  const questions = Array.isArray(body.questions) ? body.questions : []
  const topicKeys = Array.isArray(body.topicKeys)
    ? body.topicKeys.map((k) => String(k || '').trim()).filter(Boolean)
    : []

  if (!subjectId) throw new ApiError('subjectId is required', 400)
  if (!Number.isFinite(term) || term < 1 || term > 3) {
    throw new ApiError('term (1–3) is required', 400)
  }
  if (!questions.length) throw new ApiError('questions array is required', 400)

  if (sourceAssessmentId) {
    const source = await prisma.assessment.findFirst({
      where: { id: sourceAssessmentId, schoolId },
      select: { id: true },
    })
    if (!source) throw new ApiError('Source assessment not found in this school', 404)
  }

  if (schemeId) {
    const scheme = await prisma.schemeOfWork.findFirst({
      where: { id: schemeId, schoolId },
      select: { id: true },
    })
    if (!scheme) throw new ApiError('Scheme not found in this school', 404)
  }

  const metaParts = []
  if (schemeId) metaParts.push(`scheme:${schemeId}`)
  if (topicKeys.length) metaParts.push(`topics:${topicKeys.slice(0, 12).join('|')}`)
  metaParts.push(`slot:${slot}`)

  const baseContext = String(body.context || questions[0]?.question || '').trim()
  const context = metaParts.length
    ? `${baseContext}\n[${metaParts.join('; ')}]`.trim()
    : baseContext
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
      description: schemeId
        ? `Scheme-based ${isMid ? 'mid-term' : 'end-of-term'} test (scheme ${schemeId})`
        : null,
      type: taskType,
      context,
      maxMarks: isMid ? 20 : 40,
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
            taskType,
            numCriteria: 4,
            title,
            description: context,
          })
        ),
      },
    },
  })

  const maxMarks = isMid ? 20 : 40
  await prisma.eczAssessmentItem.createMany({
    data: questions.map((q, idx) => ({
      assessmentId: assessment.id,
      questionNumber: idx + 1,
      content: String(q.question || q.content || q.zambianScenario || ''),
      markAllocation: Number(q.marks) || Math.floor(maxMarks / questions.length) || 1,
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
      message: isMid
        ? 'Quiz promoted to SBA Mid-term Assessment'
        : 'Quiz promoted to SBA End of Term Test (40 marks)',
      data: assessment,
      slot,
    },
    { status: 201 }
  )
})
