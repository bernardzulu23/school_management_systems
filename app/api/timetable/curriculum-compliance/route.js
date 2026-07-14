export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { buildCurriculumComplianceReport } from '@/lib/timetable/curriculumComplianceReport'
import { buildCurriculumComplianceDocx } from '@/lib/timetable/curriculumComplianceDocx'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

const ALLOWED = new Set(['headteacher', 'administrator', 'admin', 'superadmin', 'hod'])

/**
 * GET /api/timetable/curriculum-compliance?term=&academicYear=&format=json or docx
 * Periods scheduled vs curriculum-required (same math as MISSING_PERIODS).
 */
export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!ALLOWED.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const { searchParams } = new URL(req.url)
  const term = safeQueryString(searchParams.get('term'), { defaultValue: 'Term 1', maxLength: 64 })
  const academicYear = safeQueryString(searchParams.get('academicYear'), {
    defaultValue: String(new Date().getFullYear()),
    maxLength: 16,
  })
  const format = String(searchParams.get('format') || 'json').toLowerCase()

  const report = await buildCurriculumComplianceReport(prisma, {
    schoolId,
    term,
    academicYear,
  })

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  })
  report.schoolName = school?.name || 'School'

  if (format === 'docx') {
    const buffer = await buildCurriculumComplianceDocx(report)
    const filename = `curriculum-compliance-${term.replace(/\s+/g, '-')}-${academicYear}.docx`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json(report)
})
