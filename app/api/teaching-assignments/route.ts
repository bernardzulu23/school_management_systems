import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'TEACHER', 'teacher', 'hod'])) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await getSchoolIdFromRequest(req as any)
  if (!schoolId)
    return NextResponse.json({ success: false, error: 'Missing school context' }, { status: 400 })

  const list = await prisma.teachingAssignment.findMany({
    where: { schoolId },
    select: {
      id: true,
      teacherId: true,
      subjectId: true,
      classId: true,
      teacher: { select: { id: true, user: { select: { name: true } } } },
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true, year_group: true } },
    },
    orderBy: [{ classId: 'asc' }],
  })

  return NextResponse.json({ success: true, data: list })
}
