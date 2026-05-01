export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { resolveDepartmentScope } from '@/lib/utils/departmentResolver'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const isAllowedRole = roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])
  const hasHodProfile = await prisma.headOfDepartment.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: { id: true },
  })
  if (!isAllowedRole && !hasHodProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const scope = String(searchParams.get('scope') || '')
    .trim()
    .toLowerCase()
  const q = String(searchParams.get('q') || '').trim()

  const wantsTeachers =
    String(role || '')
      .trim()
      .toLowerCase() === 'teacher'

  const shouldScopeToDepartment =
    wantsTeachers && (scope === 'department' || Boolean(hasHodProfile))

  let teacherUserIds = null
  if (shouldScopeToDepartment) {
    const hodProfile = await prisma.headOfDepartment.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: { departmentId: true, department: true, departmentRef: { select: { name: true } } },
    })

    const deptId = hodProfile?.departmentId || null
    const deptName =
      hodProfile?.departmentRef?.name || hodProfile?.department || hodProfile?.department || null

    if (!deptId && !deptName) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    const resolved = await resolveDepartmentScope({
      prisma,
      schoolId,
      departmentId: deptId,
      departmentName: deptName,
    })
    const departmentIds = new Set(resolved.departmentIds.map(String))
    const departmentNameAliases = resolved.departmentNameAliases

    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        ...(departmentIds.size > 0 || departmentNameAliases.length > 0
          ? {
              OR: [
                ...(departmentIds.size > 0
                  ? [
                      {
                        departments: { some: { departmentId: { in: Array.from(departmentIds) } } },
                      },
                    ]
                  : []),
                ...(departmentNameAliases.length > 0
                  ? [
                      {
                        OR: departmentNameAliases.map((n) => ({
                          department: { equals: String(n), mode: 'insensitive' },
                        })),
                      },
                    ]
                  : []),
              ],
            }
          : {}),
      },
      select: { userId: true },
      take: 50000,
    })

    teacherUserIds = teachers.map((t) => t.userId).filter(Boolean)
  }

  const where = {
    schoolId,
    ...(role ? { role: { equals: String(role), mode: 'insensitive' } } : {}),
    ...(Array.isArray(teacherUserIds) ? { id: { in: teacherUserIds } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      contact_number: true,
      profile_picture_url: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ success: true, data: users })
}
