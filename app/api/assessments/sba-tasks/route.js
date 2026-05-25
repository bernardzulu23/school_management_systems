export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { staffRoleDeniedMessage } from '@/lib/auth/roles'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { validateFormLevelForSBA, validateZambianContext } from '@/lib/ecz/ecz-compliance'
import { generateEczRubricCriteria, criteriaToPrismaCreate } from '@/lib/ecz/ecz-rubric-builder'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const POST = withSecureApi(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: staffRoleDeniedMessage(auth.user?.role) }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const formLevel = Number(body.formLevel)
  const component = body.component === 'FINAL_EXAMINATION' ? 'FINAL_EXAMINATION' : 'SBA_TASK'

  if (component === 'SBA_TASK') {
    const formCheck = validateFormLevelForSBA(formLevel)
    if (!formCheck.valid) return NextResponse.json({ error: formCheck.error }, { status: 400 })

    const contextCheck = validateZambianContext(body.context)
    if (!contextCheck.valid)
      return NextResponse.json({ error: contextCheck.error }, { status: 400 })
  }

  const subjectId = String(body.subjectId || '').trim()
  if (!subjectId) return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } })
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

  const title = String(body.title || '').trim()
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  try {
    const assessment = await prisma.eczAssessment.create({
      data: {
        schoolId,
        subjectId,
        component,
        formLevel,
        title,
        description: body.description ? String(body.description) : null,
        type: String(body.type || 'Project'),
        context: body.context ? String(body.context) : null,
        sbaTaskTemplate: body.sbaTaskTemplate ? String(body.sbaTaskTemplate) : null,
        materialsProvided: Array.isArray(body.materialsProvided) ? body.materialsProvided : [],
        elementLabel: body.elementOfConstruct ? String(body.elementOfConstruct) : null,
        maxMarks: Number(body.maxMarks) || 20,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        submissionDeadline: body.submissionDeadline ? new Date(body.submissionDeadline) : null,
        createdBy: auth.user.id,
        status: 'DRAFT',
      },
      include: { subject: true },
    })

    if (body.createDefaultRubric !== false && component === 'SBA_TASK') {
      let criteriaRows = criteriaToPrismaCreate(
        generateEczRubricCriteria({
          subjectName: subject.name,
          taskType: String(body.type || 'Project'),
          numCriteria: body.numCriteria ?? 4,
          title,
          description: body.description
            ? String(body.description)
            : body.context
              ? String(body.context)
              : '',
        })
      )
      if (Array.isArray(body.rubricCriteria) && body.rubricCriteria.length > 0) {
        criteriaRows = criteriaToPrismaCreate(body.rubricCriteria)
      }
      await prisma.eczRubric.create({
        data: {
          assessmentId: assessment.id,
          criteria: { create: criteriaRows },
        },
      })
    }

    if (Array.isArray(body.items) && body.items.length > 0) {
      await prisma.eczAssessmentItem.createMany({
        data: body.items.map((item, idx) => ({
          assessmentId: assessment.id,
          elementId: item.elementId || null,
          questionNumber: Number(item.questionNumber) || idx + 1,
          content: String(item.content || ''),
          markAllocation: Number(item.markAllocation) || 2,
          commandTerm: item.commandTerm ? String(item.commandTerm) : null,
          expectedAnswer: item.expectedAnswer ? String(item.expectedAnswer) : null,
          markingGuidance: item.markingGuidance ? String(item.markingGuidance) : null,
          bloomsLevel: item.bloomsLevel ? String(item.bloomsLevel) : null,
          zambiContext: item.zambiContext !== false,
        })),
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Assessment created successfully',
        data: assessment,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating ECZ assessment:', error)
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 })
  }
})

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ error: staffRoleDeniedMessage(auth.user?.role) }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const formLevel = searchParams.get('formLevel')
    ? parseInt(searchParams.get('formLevel'), 10)
    : undefined
  const subjectId = searchParams.get('subjectId') || undefined
  const component = searchParams.get('component') || undefined

  try {
    const tasks = await prisma.eczAssessment.findMany({
      where: {
        schoolId,
        ...(formLevel ? { formLevel } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(component ? { component } : {}),
      },
      include: {
        subject: true,
        rubric: { include: { criteria: true } },
        _count: { select: { scores: true, items: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: tasks })
  } catch (error) {
    console.error('Error fetching ECZ assessments:', error)
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
  }
})
