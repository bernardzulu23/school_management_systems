import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const teacherId = routeParams.id

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    include: {
      departments: {
        include: { department: true },
      },
      user: { select: { name: true, email: true } },
    },
  })

  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: {
      teacherId: teacher.id,
      teacherName: teacher.user?.name || null,
      departments: teacher.departments.map((td) => ({
        id: td.departmentId,
        name: td.department.name,
      })),
    },
  })
}

export async function PUT(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const teacherId = routeParams.id
  const body = await request.json()

  const departmentNames = Array.isArray(body.departmentNames)
    ? body.departmentNames.map(String)
    : []
  const departmentIds = Array.isArray(body.departmentIds) ? body.departmentIds.map(String) : []

  if (departmentNames.length === 0 && departmentIds.length === 0) {
    return NextResponse.json(
      { error: 'departmentNames or departmentIds required' },
      { status: 400 }
    )
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    select: { id: true },
  })
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

  const departmentsById = departmentIds.length
    ? await prisma.department.findMany({
        where: { schoolId, id: { in: departmentIds } },
        select: { id: true, name: true },
      })
    : []

  const departmentsByName = departmentNames.length
    ? await Promise.all(
        departmentNames
          .map((n) => n.trim())
          .filter(Boolean)
          .map((name) =>
            prisma.department.upsert({
              where: { schoolId_name: { schoolId, name } },
              create: { schoolId, name },
              update: {},
              select: { id: true, name: true },
            })
          )
      )
    : []

  const deptIds = Array.from(new Set([...departmentsById, ...departmentsByName].map((d) => d.id)))

  await prisma.$transaction(async (tx) => {
    await tx.teacherDepartment.deleteMany({
      where: {
        teacherId: teacher.id,
        departmentId: { notIn: deptIds },
      },
    })

    if (deptIds.length > 0) {
      await tx.teacherDepartment.createMany({
        data: deptIds.map((departmentId) => ({
          teacherId: teacher.id,
          departmentId,
        })),
        skipDuplicates: true,
      })
    }
  })

  const updated = await prisma.teacher.findFirst({
    where: { id: teacher.id, schoolId },
    include: {
      departments: { include: { department: true } },
    },
  })

  return NextResponse.json({
    success: true,
    data:
      updated?.departments.map((td) => ({ id: td.departmentId, name: td.department.name })) || [],
  })
}
