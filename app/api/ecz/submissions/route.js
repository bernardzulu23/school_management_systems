export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import {
  validateSubmissionDeadline,
  getDeadlineStatus,
  getSBASubmissionDeadline,
  canCreateSBATask,
} from '@/lib/middleware/ecz-validation'
import { generateECZCSV } from '@/lib/ecz/ecz-csv'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeStringId, safeQueryString } from '@/lib/security/safeQueryValue'
import { ECZ_SUBMIT_ROLES } from '@/lib/ecz/routeAuth'

export const POST = withSecureHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ECZ_SUBMIT_ROLES)) {
    return NextResponse.json({ error: 'Only Admin/HOD can submit to ECZ' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const body = await request.json().catch(() => ({}))
  const subjectId = safeStringId(body.subjectId)
  const level = Number(body.formLevel)
  const yearRaw = body.academicYear
  const year = Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : new Date().getFullYear()

  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })
  }
  if (!Number.isFinite(level)) {
    return NextResponse.json({ error: 'formLevel is required' }, { status: 400 })
  }

  const formGate = canCreateSBATask(level)
  if (!formGate.allowed) {
    return NextResponse.json({ error: formGate.reason }, { status: 400 })
  }

  const deadlineCheck = validateSubmissionDeadline(year)
  if (!deadlineCheck.valid) {
    return NextResponse.json({ error: deadlineCheck.error }, { status: 400 })
  }

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
    select: { id: true },
  })
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

  const scores = await prisma.eczAssessmentScore.findMany({
    where: {
      schoolId,
      formLevel: level,
      academicYear: year,
      assessment: { subjectId },
    },
    include: {
      assessment: { include: { subject: true } },
      student: true,
    },
    take: 5000,
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
  const deadline = getSBASubmissionDeadline(year)

  const submission = await prisma.eczSubmission.upsert({
    where: {
      schoolId_subjectId_formLevel_academicYear: {
        schoolId,
        subjectId,
        formLevel: level,
        academicYear: year,
      },
    },
    create: {
      schoolId,
      subjectId,
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
      deadline,
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
      assessment: { subjectId },
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

export const GET = withSecureHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ECZ_SUBMIT_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const { searchParams } = new URL(request.url)
  const yearRaw = safeQueryString(searchParams.get('academicYear'))
  const academicYear =
    yearRaw && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : new Date().getFullYear()

  const deadline = getDeadlineStatus(academicYear)
  return NextResponse.json({ success: true, ...deadline, data: deadline })
})
