import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

function standardZambianClasses() {
  const sections = ['A', 'B', 'C', 'D']
  const grades = [8, 9, 10, 11, 12]
  const classes = []
  for (const grade of grades) {
    for (const section of sections) {
      classes.push({
        name: `${grade}${section}`,
        year_group: `Grade ${grade}`,
        section,
      })
    }
  }
  return classes
}

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    for (const c of standardZambianClasses()) {
      await tx.class.upsert({
        where: { schoolId_name: { schoolId, name: c.name } },
        create: {
          schoolId,
          name: c.name,
          year_group: c.year_group,
          section: c.section,
        },
        update: {},
      })
    }
  })

  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: [{ year_group: 'asc' }, { section: 'asc' }],
    select: { id: true, name: true, year_group: true, section: true },
  })

  return NextResponse.json({ success: true, data: classes })
}
