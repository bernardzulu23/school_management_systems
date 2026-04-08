const { PrismaClient } = require('@prisma/client')
const ExcelJS = require('exceljs')
const fs = require('fs')
const path = require('path')

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const name = key.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[name] = true
    } else {
      args[name] = next
      i += 1
    }
  }
  return args
}

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

async function main() {
  const prisma = new PrismaClient()
  const args = parseArgs(process.argv)

  const outputDir = args.outputDir
    ? path.resolve(String(args.outputDir))
    : path.resolve(process.cwd(), 'exports')

  const outputFile = args.output
    ? path.resolve(String(args.output))
    : path.join(outputDir, `users_export_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`)

  const schoolId = args.schoolId ? String(args.schoolId) : ''
  const subdomain = args.subdomain ? String(args.subdomain) : ''

  fs.mkdirSync(path.dirname(outputFile), { recursive: true })

  const schoolFilter = {}
  if (schoolId) schoolFilter.id = schoolId
  if (subdomain) schoolFilter.subdomain = subdomain

  const schools = await prisma.school.findMany({
    where: Object.keys(schoolFilter).length ? schoolFilter : undefined,
    select: { id: true, name: true, subdomain: true, active: true },
    orderBy: { name: 'asc' },
  })

  if (schools.length === 0) {
    throw new Error('No schools matched the provided filter')
  }

  const schoolById = new Map(schools.map((s) => [String(s.id), s]))
  const schoolIds = schools.map((s) => s.id)

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

  const summaryRows = []
  for (const s of schools) {
    const [usersCount, studentsCount, teachersCount, hodsCount, headteachersCount] =
      await Promise.all([
        prisma.user.count({ where: { schoolId: s.id } }),
        prisma.student.count({ where: { schoolId: s.id } }),
        prisma.teacher.count({ where: { schoolId: s.id } }),
        prisma.headOfDepartment.count({ where: { schoolId: s.id } }),
        prisma.user.count({
          where: { schoolId: s.id, role: { in: ['headteacher', 'HEADTEACHER'] } },
        }),
      ])

    summaryRows.push({
      schoolId: s.id,
      schoolName: s.name,
      subdomain: s.subdomain,
      active: s.active ? 'yes' : 'no',
      users: usersCount,
      students: studentsCount,
      teachers: teachersCount,
      hods: hodsCount,
      headteachers: headteachersCount,
    })
  }

  summary.addRows(summaryRows)

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
    where: { schoolId: { in: schoolIds } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      schoolId: true,
      createdAt: true,
    },
    orderBy: [{ schoolId: 'asc' }, { role: 'asc' }, { email: 'asc' }],
    take: 200000,
  })

  usersWs.addRows(
    users.map((u) => ({
      id: u.id,
      name: safeString(u.name),
      email: safeString(u.email),
      role: safeString(u.role),
      schoolId: u.schoolId,
      schoolName: schoolById.get(String(u.schoolId))?.name || '',
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
    where: { schoolId: { in: schoolIds } },
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
    orderBy: [{ schoolId: 'asc' }, { class: 'asc' }, { name: 'asc' }],
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
      schoolName: schoolById.get(String(s.schoolId))?.name || '',
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
    where: { schoolId: { in: schoolIds } },
    select: {
      id: true,
      userId: true,
      department: true,
      schoolId: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ schoolId: 'asc' }, { department: 'asc' }, { id: 'asc' }],
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
      schoolName: schoolById.get(String(t.schoolId))?.name || '',
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
    where: { schoolId: { in: schoolIds } },
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
    orderBy: [{ schoolId: 'asc' }, { department: 'asc' }, { id: 'asc' }],
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
      schoolName: schoolById.get(String(h.schoolId))?.name || '',
      createdAt: iso(h.createdAt),
    }))
  )

  await workbook.xlsx.writeFile(outputFile)

  const totalStudents = summaryRows.reduce((s, r) => s + Number(r.students || 0), 0)
  const totalTeachers = summaryRows.reduce((s, r) => s + Number(r.teachers || 0), 0)

  console.log(`Export created: ${outputFile}`)
  console.log(`Total students: ${totalStudents}`)
  console.log(`Total teachers: ${totalTeachers}`)

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  try {
    const prisma = new PrismaClient()
    await prisma.$disconnect()
  } catch {}
  process.exit(1)
})
