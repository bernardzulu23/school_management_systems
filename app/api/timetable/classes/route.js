export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile, resolveHodDepartmentIds } from '@/lib/utils/hodDepartmentScope'
import { isSchoolAdminOrHead } from '@/lib/utils/hodAccess'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const departmentId = String(searchParams.get('departmentId') || '').trim()

  if (departmentId) {
    const hodProfile = await getHodProfile(prisma, auth.user.id, schoolId)
    if (hodProfile && !isSchoolAdminOrHead(auth.user)) {
      const allowedIds = await resolveHodDepartmentIds(prisma, schoolId, hodProfile)
      if (allowedIds.length > 0 && !allowedIds.includes(departmentId)) {
        throw new ApiError('Department not in your scope', 403)
      }
    }
  }

  const where = { schoolId, ...(departmentId ? { departmentId } : {}) }

  let classes = await prisma.class.findMany({
    where,
    include: { department: { select: { id: true, name: true, code: true } } },
    orderBy: [{ year_group: 'asc' }, { name: 'asc' }],
  })

  if (departmentId && classes.length === 0) {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId, departments: { some: { departmentId } } },
      include: {
        teachingAssignments: { include: { class: true } },
        classes: true,
      },
    })
    const classById = new Map()
    for (const t of teachers) {
      for (const a of t.teachingAssignments || []) {
        if (a?.class?.id) classById.set(String(a.class.id), a.class)
      }
      for (const c of t.classes || []) {
        if (c?.id) classById.set(String(c.id), c)
      }
    }
    classes = Array.from(classById.values()).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    )
  }

  return NextResponse.json({
    success: true,
    data: classes.map((c) => ({
      id: c.id,
      name: c.name,
      classId: c.name,
      form: c.year_group || '',
      section: c.section || '',
      departmentId: c.departmentId || departmentId || null,
      department: c.department || null,
      label: c.name,
    })),
  })
})
