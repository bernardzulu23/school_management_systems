import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { DEPARTMENTS } from '@/lib/constants'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    for (const name of DEPARTMENTS) {
      await tx.department.upsert({
        where: { schoolId_name: { schoolId, name } },
        create: { schoolId, name },
        update: {},
      })
    }
  })

  const departments = await prisma.department.findMany({
    where: { schoolId, name: { in: DEPARTMENTS } },
  })

  const order = new Map(DEPARTMENTS.map((name, idx) => [name, idx]))
  const sorted = departments
    .slice()
    .sort((a, b) => (order.get(a.name) ?? 999) - (order.get(b.name) ?? 999))

  return NextResponse.json({ success: true, data: sorted })
}
