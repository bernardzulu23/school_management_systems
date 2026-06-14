import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { getHodTeacherPerformance } from '@/lib/analytics/hodTeacherPerformance'
import { assertHodSchoolAccess } from '@/lib/school/hodAccess'

function safeString(v) {
  return v === null || v === undefined ? '' : String(v)
}

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['HOD', 'hod', 'ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertHodSchoolAccess(schoolId)

  const userId = String(auth.user?.id || '').trim()
  if (!userId) throw new ApiError('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const term = searchParams.get('term')
  const yearRaw = searchParams.get('year')
  const year = yearRaw ? Number(yearRaw) : null

  const data = await getHodTeacherPerformance({ prisma, schoolId, userId, term, year })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'school_management_systems'
  workbook.created = new Date()

  const ws = workbook.addWorksheet('Teacher Performance')
  ws.columns = [
    { header: 'Teacher Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Department', key: 'department', width: 22 },
    { header: 'Average Score (%)', key: 'averageScore', width: 18 },
    { header: 'Results Entered', key: 'resultsEntered', width: 14 },
    { header: 'Classes', key: 'classes', width: 28 },
    { header: 'Subjects', key: 'subjects', width: 38 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  ws.addRows(
    data.teacherPerformance.map((t) => ({
      name: safeString(t.name),
      email: safeString(t.email),
      department: safeString(t.department),
      averageScore: Number(t.averageScore) || 0,
      resultsEntered: Number(t.resultsEntered) || 0,
      classes: Array.isArray(t.classes) ? t.classes.join(', ') : '',
      subjects: Array.isArray(t.subjects) ? t.subjects.join(', ') : '',
    }))
  )

  const meta = workbook.addWorksheet('Filters')
  meta.columns = [
    { header: 'Key', key: 'k', width: 18 },
    { header: 'Value', key: 'v', width: 40 },
  ]
  meta.getRow(1).font = { bold: true }
  meta.addRows([
    { k: 'Department', v: safeString(data.department?.name || '') },
    { k: 'Term', v: safeString(data.term || '') },
    { k: 'Year', v: safeString(data.year || '') },
    { k: 'Exported At', v: new Date().toISOString() },
  ])

  const buffer = await workbook.xlsx.writeBuffer()
  const filename =
    `hod_teacher_performance_${safeString(data.department?.name || 'department')}.xlsx`.replace(
      /\s+/g,
      '_'
    )

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
})
