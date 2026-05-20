export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { DEPARTMENTS } from '@/lib/constants'
import { getHodProfile, resolveHodDepartmentIds } from '@/lib/utils/hodDepartmentScope'

export async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  await prisma.department.createMany({
    data: DEPARTMENTS.map((name) => ({ schoolId, name })),
    skipDuplicates: true,
  })

  const departments = await prisma.department.findMany({
    where: { schoolId, name: { in: DEPARTMENTS } },
  })

  const order = new Map(DEPARTMENTS.map((name, idx) => [name, idx]))
  let sorted = departments
    .slice()
    .sort((a, b) => (order.get(a.name) ?? 999) - (order.get(b.name) ?? 999))

  const isAdminOrHead = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const hodProfile = await getHodProfile(prisma, auth.user.id, schoolId)
  const isHod = roleCheck(auth.user, ['HOD', 'hod']) || Boolean(hodProfile)
  if (isHod && !isAdminOrHead) {
    const allowedIds = await resolveHodDepartmentIds(prisma, schoolId, hodProfile)
    if (allowedIds.length > 0) {
      const allowed = new Set(allowedIds)
      sorted = sorted.filter((d) => allowed.has(String(d.id)))
    }
  }

  return NextResponse.json({ success: true, data: sorted })
}
