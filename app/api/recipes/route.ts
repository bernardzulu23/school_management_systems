import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async function GET(req: NextRequest) {
  const auth = await authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'HOD'])) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(req as any, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId)
    return NextResponse.json({ success: false, error: 'Missing school context' }, { status: 400 })

  const url = new URL(req.url)
  const assignmentId = safeQueryString(url.searchParams.get('assignmentId'))
  const teacherId = safeQueryString(url.searchParams.get('teacherId'))
  const classId = safeQueryString(url.searchParams.get('classId'))
  const subjectId = safeQueryString(url.searchParams.get('subjectId'))

  const data = await prisma.schedulingRecipe.findMany({
    where: {
      schoolId,
      ...(assignmentId ? { teachingAssignmentId: assignmentId } : {}),
      ...(teacherId ? { teacherId } : {}),
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
    },
    include: { blocks: true, constraints: true },
    orderBy: [{ updatedAt: 'desc' }],
    take: 200,
  })

  return NextResponse.json({ success: true, data })
})
