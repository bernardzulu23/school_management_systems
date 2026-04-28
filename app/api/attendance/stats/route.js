export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

function parseMonth(value) {
  const s = String(value || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  return { key: `${m[1]}-${m[2]}`, start, end }
}

function genderKey(value) {
  const g = String(value || '')
    .trim()
    .toLowerCase()
  if (g.startsWith('m')) return 'male'
  if (g.startsWith('f')) return 'female'
  return 'unknown'
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

async function getHodScopedClassIds(schoolId, userId) {
  const hod = await prisma.headOfDepartment.findFirst({
    where: { schoolId, userId: String(userId || '') },
    select: { departmentId: true, department: true },
  })

  const deptId = hod?.departmentId
  const deptName = hod?.department
  if (!deptId && !deptName) return []

  const teacherIdsFromJoin = deptId
    ? await prisma.teacherDepartment.findMany({
        where: { departmentId: deptId },
        select: { teacherId: true },
      })
    : []

  const teacherIdsFromString = deptName
    ? await prisma.teacher.findMany({
        where: { schoolId, department: { equals: deptName, mode: 'insensitive' } },
        select: { id: true },
      })
    : []

  const teacherIds = Array.from(
    new Set(
      [
        ...teacherIdsFromJoin.map((t) => String(t.teacherId)),
        ...teacherIdsFromString.map((t) => String(t.id)),
      ].filter(Boolean)
    )
  )

  if (teacherIds.length === 0) return []

  const assignments = await prisma.teachingAssignment.findMany({
    where: { schoolId, teacherId: { in: teacherIds } },
    select: { classId: true },
  })

  const teacherClasses = await prisma.teacher.findMany({
    where: { schoolId, id: { in: teacherIds } },
    select: { classes: { select: { id: true } } },
  })

  const classIds = Array.from(
    new Set([
      ...assignments.map((a) => String(a.classId || '')).filter(Boolean),
      ...teacherClasses.flatMap((t) =>
        (t.classes || []).map((c) => String(c.id || '')).filter(Boolean)
      ),
    ])
  )

  return classIds
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const userId = String(auth.user?.id || '').trim()
  const isAdmin = roleCheck(auth.user, ['ADMIN'])
  const isHod = roleCheck(auth.user, ['HOD'])
  if (!isAdmin && !isHod) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const month = parseMonth(searchParams.get('month') || '')
  if (!month) return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 })

  const format = String(searchParams.get('format') || '')
    .trim()
    .toLowerCase()

  const allowedClassIds = isHod ? await getHodScopedClassIds(schoolId, userId) : null
  if (isHod && (!allowedClassIds || allowedClassIds.length === 0)) {
    const empty = { monthKey: month.key, classes: [], totals: { male: 0, female: 0, unknown: 0 } }
    if (format === 'csv') {
      return new Response(
        'month,class,gender,enrolled,present,absent,late,excused,totalRecords\n',
        {
          headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        }
      )
    }
    return NextResponse.json({ success: true, data: empty })
  }

  const classWhere = isHod ? { id: { in: allowedClassIds } } : {}
  const classes = await prisma.class.findMany({
    where: { schoolId, ...classWhere },
    select: { id: true, name: true, year_group: true },
    orderBy: { name: 'asc' },
  })
  const classIds = classes.map((c) => c.id)

  const students = await prisma.student.findMany({
    where: { schoolId, ...(classIds.length > 0 ? { classId: { in: classIds } } : {}) },
    select: { id: true, classId: true, user: { select: { gender: true } } },
  })

  const studentMeta = new Map(
    students.map((s) => [
      String(s.id),
      { classId: String(s.classId || ''), gender: genderKey(s.user?.gender) },
    ])
  )

  const attendance = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: month.start, lt: month.end },
      studentId: { in: students.map((s) => s.id) },
    },
    select: { studentId: true, status: true },
  })

  const initCounters = () => ({
    enrolled: { male: 0, female: 0, unknown: 0 },
    present: { male: 0, female: 0, unknown: 0 },
    absent: { male: 0, female: 0, unknown: 0 },
    late: { male: 0, female: 0, unknown: 0 },
    excused: { male: 0, female: 0, unknown: 0 },
    totalRecords: { male: 0, female: 0, unknown: 0 },
  })

  const byClass = new Map(
    classes.map((c) => [String(c.id), { classId: c.id, className: c.name, ...initCounters() }])
  )

  students.forEach((s) => {
    const meta = studentMeta.get(String(s.id))
    if (!meta?.classId) return
    const row = byClass.get(meta.classId)
    if (!row) return
    row.enrolled[meta.gender] += 1
  })

  attendance.forEach((r) => {
    const meta = studentMeta.get(String(r.studentId))
    if (!meta?.classId) return
    const row = byClass.get(meta.classId)
    if (!row) return
    const g = meta.gender
    row.totalRecords[g] += 1
    const status = String(r.status || '').toLowerCase()
    if (status === 'present') row.present[g] += 1
    else if (status === 'absent') row.absent[g] += 1
    else if (status === 'late') row.late[g] += 1
    else if (status === 'excused') row.excused[g] += 1
  })

  const outputClasses = Array.from(byClass.values())

  const totals = initCounters()
  outputClasses.forEach((c) => {
    ;['male', 'female', 'unknown'].forEach((g) => {
      totals.enrolled[g] += c.enrolled[g]
      totals.present[g] += c.present[g]
      totals.absent[g] += c.absent[g]
      totals.late[g] += c.late[g]
      totals.excused[g] += c.excused[g]
      totals.totalRecords[g] += c.totalRecords[g]
    })
  })

  if (format === 'csv') {
    const header = 'month,class,gender,enrolled,present,absent,late,excused,totalRecords\n'
    const lines = []
    outputClasses.forEach((c) => {
      ;['male', 'female', 'unknown'].forEach((g) => {
        lines.push(
          [
            month.key,
            c.className,
            g,
            c.enrolled[g],
            c.present[g],
            c.absent[g],
            c.late[g],
            c.excused[g],
            c.totalRecords[g],
          ]
            .map(csvEscape)
            .join(',')
        )
      })
    })
    return new Response(header + lines.join('\n') + '\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="attendance_returns_${month.key}.csv"`,
      },
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      monthKey: month.key,
      classes: outputClasses,
      totals,
    },
  })
})
