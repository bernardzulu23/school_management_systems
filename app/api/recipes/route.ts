import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await getSchoolIdFromRequest(req as any)
  if (!schoolId)
    return NextResponse.json({ success: false, error: 'Missing school context' }, { status: 400 })

  const url = new URL(req.url)
  const assignmentId = String(url.searchParams.get('assignmentId') || '').trim()
  const teacherId = String(url.searchParams.get('teacherId') || '').trim()
  const classId = String(url.searchParams.get('classId') || '').trim()
  const subjectId = String(url.searchParams.get('subjectId') || '').trim()

  const where: any = { schoolId }
  if (assignmentId) where.teachingAssignmentId = assignmentId
  if (teacherId) where.teacherId = teacherId
  if (classId) where.classId = classId
  if (subjectId) where.subjectId = subjectId

  const data = await prisma.schedulingRecipe.findMany({
    where,
    include: { blocks: true, constraints: true },
    orderBy: [{ updatedAt: 'desc' }],
  })

  return NextResponse.json({ success: true, data })
}
