export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { computeRubricScore } from '@/lib/ecz/ecz-compliance'
import {
  canCreateSBATask,
  validateSBAScore,
  computeTotalSBAScore,
  SBA_TERM_TEST_MARKS,
} from '@/lib/middleware/ecz-validation'
import { withSecureApi } from '@/lib/middleware/secureApi'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const POST = withSecureApi(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const formLevel = Number(body.formLevel)
  const formCheck = canCreateSBATask(formLevel)
  if (!formCheck.allowed) return NextResponse.json({ error: formCheck.reason }, { status: 400 })

  const assessmentId = safeStringId(body.assessmentId)
  if (!assessmentId)
    return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 })

  const assessment = await prisma.eczAssessment.findFirst({
    where: { id: assessmentId, schoolId },
    include: { subject: true },
  })
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  const studentId = safeStringId(body.studentId || body.learnerId)
  if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })

  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const academicYear = Number(body.academicYear) || new Date().getFullYear()
  const taskNumber = Number(body.taskNumber) || 1

  let taskScore = Number(body.score)
  if (Number.isNaN(taskScore) && body.excellentCount !== undefined) {
    const { calculatedScore } = computeRubricScore(body)
    taskScore =
      taskNumber === 4 ? Math.min(SBA_TERM_TEST_MARKS, calculatedScore * 2) : calculatedScore
  }
  if (Number.isNaN(taskScore)) taskScore = 0

  const existing = await prisma.eczAssessmentScore.findUnique({
    where: {
      assessmentId_studentId_academicYear: {
        assessmentId: assessment.id,
        studentId,
        academicYear,
      },
    },
  })

  const patch = {}
  if (taskNumber === 1) patch.task1Score = Math.min(20, taskScore)
  else if (taskNumber === 2) patch.task2Score = Math.min(20, taskScore)
  else if (taskNumber === 3) patch.task3Score = Math.min(20, taskScore)
  else if (taskNumber === 4) patch.termTestScore = Math.min(SBA_TERM_TEST_MARKS, taskScore)

  const merged = {
    task1Score: existing?.task1Score ?? 0,
    task2Score: existing?.task2Score ?? 0,
    task3Score: existing?.task3Score ?? 0,
    termTestScore: existing?.termTestScore ?? 0,
    ...patch,
  }

  const scoreValidation = validateSBAScore(merged)
  if (!scoreValidation.valid) {
    return NextResponse.json({ error: scoreValidation.errors.join('; ') }, { status: 400 })
  }

  patch.totalSBAScore = scoreValidation.total
  patch.submissionStatus = 'COMPLETED'
  patch.rubricBreakdown = body.rubricBreakdown || {
    excellentCount: body.excellentCount,
    goodCount: body.goodCount,
    fairCount: body.fairCount,
    needsImprovementCount: body.needsImprovementCount,
    taskNumber,
  }

  try {
    const score = existing
      ? await prisma.eczAssessmentScore.update({
          where: { id: existing.id },
          data: patch,
          include: { student: true, assessment: { include: { subject: true } } },
        })
      : await prisma.eczAssessmentScore.create({
          data: {
            assessmentId: assessment.id,
            studentId,
            schoolId,
            formLevel,
            academicYear,
            ...patch,
          },
          include: { student: true, assessment: { include: { subject: true } } },
        })

    return NextResponse.json(
      {
        success: true,
        message: 'SBA score recorded',
        data: {
          id: score.id,
          learnerName: score.student.name,
          subject: score.assessment.subject.name,
          totalSBAScore: score.totalSBAScore,
          formLevel: score.formLevel,
        },
      },
      { status: existing ? 200 : 201 }
    )
  } catch (error) {
    console.error('Error recording SBA score:', error)
    return NextResponse.json({ error: 'Failed to record score' }, { status: 500 })
  }
})

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const formLevel = searchParams.get('formLevel')
    ? parseInt(searchParams.get('formLevel'), 10)
    : undefined
  const academicYear = searchParams.get('academicYear')
    ? parseInt(searchParams.get('academicYear'), 10)
    : new Date().getFullYear()

  try {
    const where = {
      schoolId,
      academicYear,
      ...(subjectId ? { assessment: { subjectId } } : {}),
    }
    if (formLevel) {
      where.formLevel = formLevel
    } else {
      where.formLevel = { not: 4 }
    }

    const scores = await prisma.eczAssessmentScore.findMany({
      where,
      include: {
        assessment: { include: { subject: true } },
        student: true,
      },
      orderBy: [{ assessment: { subject: { name: 'asc' } } }, { student: { name: 'asc' } }],
    })

    const byStudent = new Map()
    for (const s of scores) {
      const key = s.studentId
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          studentId: s.studentId,
          learnerName: s.student.name,
          learnerNumber: s.student.exam_number || 'N/A',
          formLevel: s.formLevel,
          academicYear: s.academicYear,
          subjects: {},
        })
      }
      const row = byStudent.get(key)
      const subj = s.assessment.subject.name
      const prev = row.subjects[subj] || 0
      row.subjects[subj] = Math.max(prev, s.totalSBAScore || 0)
    }

    const eczData = Array.from(byStudent.values()).map((row) => ({
      learnerName: row.learnerName,
      learnerNumber: row.learnerNumber,
      formLevel: row.formLevel,
      academicYear: row.academicYear,
      sbaScore: Object.values(row.subjects).reduce((a, b) => Math.max(a, b), 0),
      subjects: row.subjects,
    }))

    return NextResponse.json({
      success: true,
      totalRecords: eczData.length,
      data: eczData,
      raw: scores,
      readyForSubmission: eczData.length > 0,
    })
  } catch (error) {
    console.error('Error fetching SBA scores:', error)
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
})
