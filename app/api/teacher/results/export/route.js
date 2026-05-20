export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

function safeString(v) {
  return v === null || v === undefined ? '' : String(v)
}

function iso(v) {
  if (!v) return ''
  try {
    return new Date(v).toISOString()
  } catch {
    return ''
  }
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const classId = String(searchParams.get('classId') || '').trim()
  const subjectId = String(searchParams.get('subjectId') || '').trim()
  const term = String(searchParams.get('term') || '').trim()
  const yearRaw = searchParams.get('year')
  const year = yearRaw ? Number(yearRaw) : null
  const template = String(searchParams.get('template') || '').trim() === '1'

  if (!classId || !subjectId) throw new ApiError('classId and subjectId are required', 400)

  const teacherProfile = roleCheck(auth.user, ['TEACHER', 'teacher'])
    ? await prisma.teacher.findUnique({ where: { userId: auth.user.id }, select: { id: true } })
    : null

  if (teacherProfile?.id) {
    const teachingAssignment = await prisma.teachingAssignment.findFirst({
      where: { schoolId, teacherId: teacherProfile.id, classId, subjectId },
      select: { id: true },
    })
    if (!teachingAssignment) throw new ApiError('Not assigned to this class and subject', 403)
  }

  const [classRecord, subjectRecord] = await Promise.all([
    prisma.class.findFirst({ where: { schoolId, id: classId }, select: { id: true, name: true } }),
    prisma.subject.findFirst({
      where: { schoolId, id: subjectId },
      select: { id: true, name: true },
    }),
  ])

  if (!classRecord) throw new ApiError('Class not found', 404)
  if (!subjectRecord) throw new ApiError('Subject not found', 404)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'school_management_systems'
  workbook.created = new Date()

  const ws = workbook.addWorksheet(template ? 'Template' : 'Results')
  ws.columns = [
    { header: 'Student ID', key: 'studentId', width: 38 },
    { header: 'Student Name', key: 'studentName', width: 26 },
    { header: 'Exam Number', key: 'examNumber', width: 18 },
    { header: 'Class', key: 'className', width: 16 },
    { header: 'Subject', key: 'subjectName', width: 22 },
    { header: 'Term', key: 'term', width: 12 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Entered By', key: 'enteredBy', width: 36 },
    { header: 'Updated At', key: 'updatedAt', width: 24 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  if (template) {
    const enrollments = await prisma.pupilSubjectEnrollment.findMany({
      where: { schoolId, classId, subjectId },
      select: { pupil: { select: { id: true, name: true, exam_number: true, class: true } } },
      orderBy: { pupil: { name: 'asc' } },
      take: 50000,
    })

    ws.addRows(
      enrollments
        .map((e) => e.pupil)
        .filter(Boolean)
        .map((s) => ({
          studentId: s.id,
          studentName: safeString(s.name),
          examNumber: safeString(s.exam_number),
          className: classRecord.name,
          subjectName: subjectRecord.name,
          term: term || '',
          year: year || '',
          score: '',
          grade: '',
          enteredBy: '',
          updatedAt: '',
        }))
    )
  } else {
    const results = await prisma.result.findMany({
      where: {
        schoolId,
        subjectId,
        ...(term ? { term } : {}),
        ...(year ? { year } : {}),
        enteredByUserId: auth.user.id,
        student: { is: { classId } },
      },
      include: {
        student: { select: { id: true, name: true, exam_number: true, class: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50000,
    })

    ws.addRows(
      results.map((r) => ({
        studentId: r.studentId,
        studentName: safeString(r.student?.name),
        examNumber: safeString(r.student?.exam_number),
        className: classRecord.name,
        subjectName: subjectRecord.name,
        term: safeString(r.term),
        year: r.year,
        score: r.score,
        grade: safeString(r.grade),
        enteredBy: safeString(r.enteredByUserId),
        updatedAt: iso(r.updatedAt),
      }))
    )
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filename =
    `${template ? 'template' : 'results'}_${safeString(classRecord.name)}_${safeString(
      subjectRecord.name
    )}.xlsx`.replace(/\s+/g, '_')

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
})
