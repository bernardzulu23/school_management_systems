import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { deleteUserCascade } from '@/lib/db/deleteCascade'

export async function GET(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findFirst({
    where: { id: routeParams.id, schoolId },
    include: { studentProfile: true, teacherProfile: true, hodProfile: true },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: user })
}

export async function PUT(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  const existing = await prisma.user.findFirst({
    where: { id: routeParams.id, schoolId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['name', 'email', 'contact_number', 'address', 'gender', 'profile_picture_url']
  const data = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data,
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const isAdminOrHead = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const isHod = roleCheck(auth.user, ['HOD', 'hod'])
  if (!isAdminOrHead && !isHod) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findFirst({
    where: { id: routeParams.id, schoolId },
    include: { studentProfile: true, teacherProfile: true, hodProfile: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (isHod && !isAdminOrHead) {
    const targetRole = String(user.role || '').toLowerCase()
    if (targetRole === 'admin' || targetRole === 'headteacher' || targetRole === 'hod') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.teacherProfile?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const hodProfile = await prisma.headOfDepartment.findFirst({
      where: { schoolId, userId: auth.user.id },
      select: { departmentId: true, department: true },
    })
    if (!hodProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const deptId = hodProfile.departmentId ? String(hodProfile.departmentId) : ''
    const deptName = String(hodProfile.department || '').trim()

    const teacherInDept = await prisma.teacher.findFirst({
      where: {
        id: user.teacherProfile.id,
        schoolId,
        OR: [
          ...(deptId
            ? [
                {
                  departments: {
                    some: { departmentId: deptId },
                  },
                },
              ]
            : []),
          ...(deptName
            ? [
                {
                  department: { equals: deptName, mode: 'insensitive' },
                },
              ]
            : []),
        ],
      },
      select: { id: true },
    })

    if (!teacherInDept) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    await deleteUserCascade({ tx, schoolId, userId: user.id })
  })

  return NextResponse.json({ success: true })
}
