export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import {
  loadScopedWeekSchedule,
  buildWeekScheduleDocx,
  buildWeekSchedulePrintHtml,
} from '@/lib/timetable/scheduleExport'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

const STAFF = new Set(['headteacher', 'administrator', 'admin', 'superadmin', 'hod', 'teacher'])

/**
 * GET /api/timetable/export-schedule?scope=teacher|class&id=&term=&academicYear=&format=docx|html
 */
export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!STAFF.has(role)) {
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
  const scope = String(searchParams.get('scope') || '').toLowerCase()
  const id = safeStringId(searchParams.get('id'))
  const format = String(searchParams.get('format') || 'docx').toLowerCase()

  if (!['teacher', 'class'].includes(scope) || !id) {
    return NextResponse.json({ error: 'scope=teacher|class and id are required' }, { status: 400 })
  }

  // Teachers may only export their own week unless leadership
  if (role === 'teacher' && scope === 'teacher' && String(id) !== String(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (role === 'teacher' && scope === 'class') {
    return NextResponse.json(
      { error: 'Teachers can only export their own schedule' },
      { status: 403 }
    )
  }

  const schedule = await loadScopedWeekSchedule(prisma, {
    schoolId,
    term,
    academicYear,
    teacherId: scope === 'teacher' ? id : null,
    classId: scope === 'class' ? id : null,
  })

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  })

  const payload = {
    schoolName: school?.name || 'School',
    term,
    academicYear,
    titleEntity: schedule.titleEntity,
    assignments: schedule.assignments,
    timeSlots: schedule.timeSlots,
  }

  if (format === 'html') {
    const html = buildWeekSchedulePrintHtml(payload)
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const buffer = await buildWeekScheduleDocx(payload)
  const slug = String(schedule.titleEntity || scope)
    .replace(/[^\w]+/g, '-')
    .slice(0, 40)
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${slug}-${term.replace(/\s+/g, '-')}-${academicYear}.docx"`,
    },
  })
})
