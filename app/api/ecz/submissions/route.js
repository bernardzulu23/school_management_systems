export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { validateSubmissionDeadline, getDeadlineStatus } from '@/lib/ecz/ecz-compliance'
import { generateECZCSV } from '@/lib/ecz/ecz-csv'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const POST = withSecureApi(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Only Admin/HOD can submit to ECZ' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const { subjectId, formLevel, academicYear } = body
  const year = Number(academicYear) || new Date().getFullYear()
  const level = Number(formLevel)

  if (level === 4) {
    return NextResponse.json(
      { error: 'Form 4 uses Final Examination only — no SBA submission' },
      { status: 400 }
    )
  }

  const deadlineCheck = validateSubmissionDeadline(year)
  if (!deadlineCheck.valid) {
    return NextResponse.json({ error: deadlineCheck.error }, { status: 400 })
  }

  const scores = await prisma.eczAssessmentScore.findMany({
    where: {
      schoolId,
      formLevel: level,
      academicYear: year,
      assessment: { subjectId: String(subjectId) },
    },
    include: {
      assessment: { include: { subject: true } },
      student: true,
    },
  })

  if (scores.length === 0) {
    return NextResponse.json({ error: 'No scores found for submission' }, { status: 400 })
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, eczCentreNumber: true },
  })

  const aggregated = new Map()
  for (const s of scores) {
    const key = s.studentId
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        learnerName: s.student.name,
        learnerNumber: s.student.exam_number || 'N/A',
        sbaScore: s.totalSBAScore || 0,
      })
    } else {
      const row = aggregated.get(key)
      row.sbaScore = Math.max(row.sbaScore, s.totalSBAScore || 0)
    }
  }

  const rows = Array.from(aggregated.values())
  const subjectName = scores[0]?.assessment?.subject?.name || 'Unknown'
  const csvData = generateECZCSV({
    school,
    subjectName,
    formLevel: level,
    academicYear: year,
    rows,
  })

  const fileName = `ecz_submission_${subjectId}_f${level}_${year}.csv`

  const submission = await prisma.eczSubmission.upsert({
    where: {
      schoolId_subjectId_formLevel_academicYear: {
        schoolId,
        subjectId: String(subjectId),
        formLevel: level,
        academicYear: year,
      },
    },
    create: {
      schoolId,
      subjectId: String(subjectId),
      formLevel: level,
      academicYear: year,
      totalLearners: rows.length,
      status: 'SUBMITTED_TO_ECZ',
      submittedAt: new Date(),
      submittedBy: auth.user.id,
      submissionFile: fileName,
      validationErrors: [],
    },
    update: {
      totalLearners: rows.length,
      status: 'SUBMITTED_TO_ECZ',
      submittedAt: new Date(),
      submittedBy: auth.user.id,
      submissionFile: fileName,
    },
  })

  await prisma.eczAssessmentScore.updateMany({
    where: {
      schoolId,
      formLevel: level,
      academicYear: year,
      assessment: { subjectId: String(subjectId) },
    },
    data: {
      submissionStatus: 'SUBMITTED_TO_ECZ',
      submittedAt: new Date(),
      submittedBy: auth.user.id,
    },
  })

  return NextResponse.json(
    {
      success: true,
      message: 'Submission prepared successfully',
      csvData,
      fileName,
      submissionId: submission.id,
      daysUntilDeadline: deadlineCheck.daysRemaining,
    },
    { status: 201 }
  )
})

export const GET = withSecureApi(async function GET(request) {
  const { searchParams } = new URL(request.url)
  const academicYear = parseInt(
    searchParams.get('academicYear') || String(new Date().getFullYear()),
    10
  )
  return NextResponse.json(getDeadlineStatus(academicYear))
})
