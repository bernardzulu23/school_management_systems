import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const role = String(searchParams.get('role') || '')
    .trim()
    .toLowerCase()

  if (role === 'teacher') {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: { user: { select: { id: true, name: true, email: true, employeeId: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20000,
    })

    return NextResponse.json({
      success: true,
      data: teachers
        .filter((t) => t?.user?.id)
        .map((t) => ({
          id: t.user.id,
          name: t.user.name || '',
          email: t.user.email || '',
          department: t.department || '',
          employee_id: t.user.employeeId || t.ts_number || '',
        })),
    })
  }

  const users = await prisma.user.findMany({
    where: { schoolId, ...(role ? { role: { equals: role, mode: 'insensitive' } } : {}) },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20000,
  })

  return NextResponse.json({ success: true, data: users })
})
