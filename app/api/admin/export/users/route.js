export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
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

function sheetColumns(ws, columns) {
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 20,
  }))
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: { id: true, name: true, subdomain: true, active: true },
  })

  if (!school) throw new ApiError('School not found', 404)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'school_management_systems'
  workbook.created = new Date()

  const summary = workbook.addWorksheet('Summary')
  sheetColumns(summary, [
    { header: 'School ID', key: 'schoolId', width: 38 },
    { header: 'School Name', key: 'schoolName', width: 32 },
    { header: 'Subdomain', key: 'subdomain', width: 26 },
    { header: 'Active', key: 'active', width: 10 },
    { header: 'Users (All Roles)', key: 'users', width: 16 },
    { header: 'Students (Student table)', key: 'students', width: 22 },
    { header: 'Teachers (Teacher table)', key: 'teachers', width: 22 },
    { header: 'HODs', key: 'hods', width: 10 },
    { header: 'Headteachers (User role)', key: 'headteachers', width: 26 },
  ])

  const [usersCount, studentsCount, teachersCount, hodsCount, headteachersCount] =
    await Promise.all([
      prisma.user.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.headOfDepartment.count({ where: { schoolId } }),
      prisma.user.count({ where: { schoolId, role: { in: ['headteacher', 'HEADTEACHER'] } } }),
    ])

  summary.addRows([
    {
      schoolId: school.id,
      schoolName: school.name,
      subdomain: school.subdomain,
      active: school.active ? 'yes' : 'no',
      users: usersCount,
      students: studentsCount,
      teachers: teachersCount,
      hods: hodsCount,
      headteachers: headteachersCount,
    },
  ])

  const usersWs = workbook.addWorksheet('Users')
  sheetColumns(usersWs, [
    { header: 'User ID', key: 'id', width: 38 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 34 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'School ID', key: 'schoolId', width: 38 },
    { header: 'School', key: 'schoolName', width: 28 },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ])

  const users = await prisma.user.findMany({
    where: { schoolId },
    select: { id: true, name: true, email: true, role: true, schoolId: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    take: 200000,
  })

  usersWs.addRows(
    users.map((u) => ({
      id: u.id,
      name: safeString(u.name),
      email: safeString(u.email),
      role: safeString(u.role),
      schoolId: u.schoolId,
      schoolName: school.name,
      createdAt: iso(u.createdAt),
    }))
  )

  const studentsWs = workbook.addWorksheet('Students')
  sheetColumns(studentsWs, [
    { header: 'Student ID', key: 'id', width: 38 },
    { header: 'Student Name', key: 'name', width: 28 },
    { header: 'User Name', key: 'userName', width: 28 },
    { header: 'Class', key: 'class', width: 16 },
    { header: 'Exam Number', key: 'exam_number', width: 18 },
    { header: 'User ID', key: 'userId', width: 38 },
    { header: 'User Email', key: 'userEmail', width: 34 },
    { header: 'School ID', key: 'schoolId', width: 38 },
    { header: 'School', key: 'schoolName', width: 28 },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ])

  const students = await prisma.student.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      class: true,
      exam_number: true,
      userId: true,
      createdAt: true,
      schoolId: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ class: 'asc' }, { name: 'asc' }],
    take: 200000,
  })

  studentsWs.addRows(
    students.map((s) => ({
      id: s.id,
      name: safeString(s.name),
      userName: safeString(s.user?.name),
      class: safeString(s.class),
      exam_number: safeString(s.exam_number),
      userId: safeString(s.userId),
      userEmail: safeString(s.user?.email),
      schoolId: s.schoolId,
      schoolName: school.name,
      createdAt: iso(s.createdAt),
    }))
  )

  const teachersWs = workbook.addWorksheet('Teachers')
  sheetColumns(teachersWs, [
    { header: 'Teacher ID', key: 'id', width: 38 },
    { header: 'User ID', key: 'userId', width: 38 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 34 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'School ID', key: 'schoolId', width: 38 },
    { header: 'School', key: 'schoolName', width: 28 },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ])

  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    select: {
      id: true,
      userId: true,
      department: true,
      schoolId: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ department: 'asc' }, { id: 'asc' }],
    take: 200000,
  })

  teachersWs.addRows(
    teachers.map((t) => ({
      id: t.id,
      userId: t.userId,
      name: safeString(t.user?.name),
      email: safeString(t.user?.email),
      department: safeString(t.department),
      schoolId: t.schoolId,
      schoolName: school.name,
      createdAt: iso(t.createdAt),
    }))
  )

  const hodsWs = workbook.addWorksheet('HODs')
  sheetColumns(hodsWs, [
    { header: 'HOD ID', key: 'id', width: 38 },
    { header: 'User ID', key: 'userId', width: 38 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 34 },
    { header: 'Department', key: 'department', width: 24 },
    { header: 'Department ID', key: 'departmentId', width: 38 },
    { header: 'School ID', key: 'schoolId', width: 38 },
    { header: 'School', key: 'schoolName', width: 28 },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ])

  const hods = await prisma.headOfDepartment.findMany({
    where: { schoolId },
    select: {
      id: true,
      userId: true,
      department: true,
      departmentId: true,
      schoolId: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      departmentRef: { select: { name: true } },
    },
    orderBy: [{ department: 'asc' }, { id: 'asc' }],
    take: 200000,
  })

  hodsWs.addRows(
    hods.map((h) => ({
      id: h.id,
      userId: h.userId,
      name: safeString(h.user?.name),
      email: safeString(h.user?.email),
      department: safeString(h.departmentRef?.name || h.department),
      departmentId: safeString(h.departmentId),
      schoolId: h.schoolId,
      schoolName: school.name,
      createdAt: iso(h.createdAt),
    }))
  )

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `users_${safeString(school.subdomain || 'school')}_${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
})
